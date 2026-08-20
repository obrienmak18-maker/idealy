-- Idempotent mission-stop refunds. A refund is represented by a positive
-- credit_ledger entry with a distinct refund key; the ledger remains append-only.
CREATE OR REPLACE FUNCTION public.refund_ai_credit(
  p_user_id UUID,
  p_mission_id UUID,
  p_debit_idempotency_key TEXT,
  p_refund_idempotency_key TEXT,
  p_amount INTEGER,
  p_reason TEXT
)
RETURNS TABLE(balance INTEGER, already_refunded BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance INTEGER;
  debit_amount INTEGER;
  debit_reason TEXT;
  already_exists BOOLEAN;
BEGIN
  IF p_user_id IS NULL OR p_debit_idempotency_key IS NULL OR p_refund_idempotency_key IS NULL
    OR length(trim(p_debit_idempotency_key)) = 0 OR length(trim(p_refund_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'Invalid credit refund identity';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 100 THEN
    RAISE EXCEPTION 'Invalid credit refund amount';
  END IF;
  IF p_refund_idempotency_key = p_debit_idempotency_key THEN
    RAISE EXCEPTION 'Refund key must differ from debit key';
  END IF;

  INSERT INTO public.user_credits (user_id, balance)
  SELECT p_user_id, COALESCE((SELECT current_energy FROM public.user_energy WHERE id = p_user_id), 100)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO current_balance
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  SELECT cl.amount, cl.reason
  INTO debit_amount, debit_reason
  FROM public.credit_ledger AS cl
  WHERE cl.user_id = p_user_id
    AND cl.idempotency_key = p_debit_idempotency_key
  LIMIT 1;

  IF debit_amount IS NULL OR debit_reason NOT LIKE 'ai:%' THEN
    RAISE EXCEPTION 'AI debit not found for refund';
  END IF;
  IF p_mission_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.missions WHERE id = p_mission_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Mission does not belong to user';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.credit_ledger
    WHERE user_id = p_user_id AND idempotency_key = p_refund_idempotency_key
  ) INTO already_exists;

  IF EXISTS (
    SELECT 1 FROM public.credit_ledger
    WHERE idempotency_key = p_refund_idempotency_key AND user_id <> p_user_id
  ) THEN
    RAISE EXCEPTION 'Refund idempotency key belongs to another user';
  END IF;
  IF already_exists THEN
    RETURN QUERY SELECT current_balance, TRUE;
    RETURN;
  END IF;

  IF p_amount > debit_amount THEN
    RAISE EXCEPTION 'Refund exceeds the original AI debit';
  END IF;

  UPDATE public.user_credits
  SET balance = current_balance + p_amount, updated_at = now()
  WHERE user_id = p_user_id;

  UPDATE public.user_energy
  SET current_energy = LEAST(max_energy, current_energy + p_amount), updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO public.credit_ledger(user_id, mission_id, idempotency_key, amount, reason)
  VALUES (p_user_id, p_mission_id, p_refund_idempotency_key, p_amount, left(p_reason, 200));

  RETURN QUERY SELECT current_balance + p_amount, FALSE;
EXCEPTION
  WHEN unique_violation THEN
    IF EXISTS (
      SELECT 1 FROM public.credit_ledger
      WHERE idempotency_key = p_refund_idempotency_key AND user_id = p_user_id
    ) THEN
      SELECT balance INTO current_balance FROM public.user_credits WHERE user_id = p_user_id;
      RETURN QUERY SELECT current_balance, TRUE;
      RETURN;
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.refund_ai_credit(UUID, UUID, TEXT, TEXT, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_ai_credit(UUID, UUID, TEXT, TEXT, INTEGER, TEXT) TO service_role;
