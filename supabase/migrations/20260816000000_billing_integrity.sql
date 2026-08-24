-- Launch hardening: atomic AI request pacing, append-only refund linkage and
-- cumulative refund protection. These functions remain Edge/service-role only.

ALTER TABLE public.credit_ledger
  ADD COLUMN IF NOT EXISTS reference_idempotency_key TEXT;

CREATE INDEX IF NOT EXISTS credit_ledger_refund_reference_idx
  ON public.credit_ledger(user_id, reference_idempotency_key)
  WHERE reference_idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.acquire_ai_request_slot(
  p_user_id UUID,
  p_minimum_interval_seconds INTEGER DEFAULT 3
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_request_at TIMESTAMPTZ;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid AI request identity';
  END IF;
  IF p_minimum_interval_seconds IS NULL
    OR p_minimum_interval_seconds < 1
    OR p_minimum_interval_seconds > 60 THEN
    RAISE EXCEPTION 'Invalid AI request interval';
  END IF;

  INSERT INTO public.user_energy (id, current_energy, max_energy)
  VALUES (p_user_id, 100, 100)
  ON CONFLICT (id) DO NOTHING;

  SELECT updated_at
    INTO last_request_at
    FROM public.user_energy
   WHERE id = p_user_id
   FOR UPDATE;

  IF last_request_at > now() - make_interval(secs => p_minimum_interval_seconds) THEN
    RETURN FALSE;
  END IF;

  UPDATE public.user_energy
     SET updated_at = now()
   WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.acquire_ai_request_slot(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_ai_request_slot(UUID, INTEGER) TO service_role;

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
  debit_mission_id UUID;
  refunded_total INTEGER;
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

  -- This row lock serializes every refund for a user, including concurrent requests.
  SELECT balance INTO current_balance
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  SELECT cl.amount, cl.reason, cl.mission_id
  INTO debit_amount, debit_reason, debit_mission_id
  FROM public.credit_ledger AS cl
  WHERE cl.user_id = p_user_id
    AND cl.idempotency_key = p_debit_idempotency_key
  LIMIT 1;

  IF debit_amount IS NULL OR debit_reason NOT LIKE 'ai:%' THEN
    RAISE EXCEPTION 'AI debit not found for refund';
  END IF;
  IF debit_mission_id IS DISTINCT FROM p_mission_id THEN
    RAISE EXCEPTION 'Refund mission does not match the original AI debit';
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

  SELECT COALESCE(SUM(cl.amount), 0)
    INTO refunded_total
    FROM public.credit_ledger AS cl
   WHERE cl.user_id = p_user_id
     AND cl.reference_idempotency_key = p_debit_idempotency_key
     AND cl.reason = 'ai:mission-stop-refund';

  IF refunded_total + p_amount > debit_amount THEN
    RAISE EXCEPTION 'Cumulative refunds exceed the original AI debit';
  END IF;

  UPDATE public.user_credits
  SET balance = current_balance + p_amount, updated_at = now()
  WHERE user_id = p_user_id;

  UPDATE public.user_energy
  SET current_energy = LEAST(max_energy, current_energy + p_amount), updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO public.credit_ledger(
    user_id,
    mission_id,
    idempotency_key,
    reference_idempotency_key,
    amount,
    reason
  )
  VALUES (
    p_user_id,
    p_mission_id,
    p_refund_idempotency_key,
    p_debit_idempotency_key,
    p_amount,
    left(p_reason, 200)
  );

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
