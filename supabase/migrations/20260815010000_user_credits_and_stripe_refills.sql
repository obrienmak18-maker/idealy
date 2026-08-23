-- Monetisation groundwork: a dedicated billing balance, kept separate from
-- thematic ways and mirrored to user_energy for the existing UI.
CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 100 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_credits FROM anon, authenticated;

DROP TRIGGER IF EXISTS user_credits_updated_at ON public.user_credits;
CREATE TRIGGER user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Existing users inherit their current managed balance once. New users start
-- with the same 100-unit trial balance used by the existing energy fallback.
INSERT INTO public.user_credits (user_id, balance)
SELECT id, current_energy
FROM public.user_energy
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.consume_ai_credit(
  p_user_id UUID,
  p_mission_id UUID,
  p_idempotency_key TEXT,
  p_amount INTEGER,
  p_reason TEXT
)
RETURNS TABLE(energy_remaining INTEGER, already_charged BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance INTEGER;
  ledger_exists BOOLEAN;
BEGIN
  IF p_user_id IS NULL OR p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'Invalid credit debit identity';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 100 THEN
    RAISE EXCEPTION 'Invalid credit amount';
  END IF;

  INSERT INTO public.user_credits (user_id, balance)
  SELECT p_user_id, COALESCE((SELECT current_energy FROM public.user_energy WHERE id = p_user_id), 100)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance
    INTO current_balance
    FROM public.user_credits
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF p_mission_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.missions WHERE id = p_mission_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Mission does not belong to user';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.credit_ledger
     WHERE idempotency_key = p_idempotency_key
       AND user_id = p_user_id
  ) INTO ledger_exists;

  IF EXISTS (
    SELECT 1 FROM public.credit_ledger
     WHERE idempotency_key = p_idempotency_key
       AND user_id <> p_user_id
  ) THEN
    RAISE EXCEPTION 'Idempotency key belongs to another user';
  END IF;

  IF ledger_exists THEN
    RETURN QUERY SELECT current_balance, TRUE;
    RETURN;
  END IF;

  IF current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  UPDATE public.user_credits
     SET balance = current_balance - p_amount,
         updated_at = now()
   WHERE user_id = p_user_id;

  -- Keep the existing Chakra display coherent while user_credits becomes the
  -- billing source of truth. This is server-side and never client-controlled.
  INSERT INTO public.user_energy (id, current_energy, max_energy)
  VALUES (p_user_id, current_balance - p_amount, 100)
  ON CONFLICT (id) DO UPDATE
    SET current_energy = EXCLUDED.current_energy,
        updated_at = now();

  INSERT INTO public.credit_ledger(user_id, mission_id, idempotency_key, amount, reason)
  VALUES (p_user_id, p_mission_id, p_idempotency_key, p_amount, left(p_reason, 200));

  RETURN QUERY SELECT current_balance - p_amount, FALSE;
EXCEPTION
  WHEN unique_violation THEN
    IF EXISTS (
      SELECT 1 FROM public.credit_ledger
       WHERE idempotency_key = p_idempotency_key
         AND user_id = p_user_id
    ) THEN
      SELECT balance INTO current_balance FROM public.user_credits WHERE user_id = p_user_id;
      RETURN QUERY SELECT current_balance, TRUE;
      RETURN;
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_credit(UUID, UUID, TEXT, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_credit(UUID, UUID, TEXT, INTEGER, TEXT) TO service_role;

-- Stripe event idempotency: the event ID itself is stored in the ledger key.
-- Stripe checkout sessions must include user_id and credit_amount metadata;
-- subscription sessions without credit_amount do not refill balances.

CREATE OR REPLACE FUNCTION public.grant_user_credits(
  p_user_id UUID,
  p_idempotency_key TEXT,
  p_amount INTEGER,
  p_reason TEXT
)
RETURNS TABLE(balance INTEGER, already_granted BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance INTEGER;
  ledger_exists BOOLEAN;
BEGIN
  IF p_user_id IS NULL OR p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'Invalid credit refill identity';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 100000 THEN
    RAISE EXCEPTION 'Invalid credit refill amount';
  END IF;

  INSERT INTO public.user_credits (user_id, balance)
  SELECT p_user_id, COALESCE((SELECT current_energy FROM public.user_energy WHERE id = p_user_id), 100)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT uc.balance
    INTO current_balance
    FROM public.user_credits AS uc
   WHERE uc.user_id = p_user_id
   FOR UPDATE;

  SELECT EXISTS(
    SELECT 1 FROM public.credit_ledger
     WHERE idempotency_key = p_idempotency_key
       AND user_id = p_user_id
  ) INTO ledger_exists;

  IF EXISTS (
    SELECT 1 FROM public.credit_ledger
     WHERE idempotency_key = p_idempotency_key
       AND user_id <> p_user_id
  ) THEN
    RAISE EXCEPTION 'Idempotency key belongs to another user';
  END IF;

  IF ledger_exists THEN
    RETURN QUERY SELECT current_balance, TRUE;
    RETURN;
  END IF;

  UPDATE public.user_credits
     SET balance = current_balance + p_amount,
         updated_at = now()
   WHERE user_id = p_user_id;


  INSERT INTO public.credit_ledger(user_id, mission_id, idempotency_key, amount, reason)
  VALUES (p_user_id, NULL, p_idempotency_key, p_amount, left(p_reason, 200));

  RETURN QUERY SELECT current_balance + p_amount, FALSE;
EXCEPTION
  WHEN unique_violation THEN
    IF EXISTS (
      SELECT 1 FROM public.credit_ledger
       WHERE idempotency_key = p_idempotency_key
         AND user_id = p_user_id
    ) THEN
      SELECT uc.balance INTO current_balance FROM public.user_credits AS uc WHERE uc.user_id = p_user_id;
      RETURN QUERY SELECT current_balance, TRUE;
      RETURN;
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_user_credits(UUID, TEXT, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_user_credits(UUID, TEXT, INTEGER, TEXT) TO service_role;
