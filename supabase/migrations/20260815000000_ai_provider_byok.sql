-- Idealy — AIProvider, BYOK chiffré et crédits idempotents
-- Les clés de fournisseur sont lisibles uniquement par le service role Edge Function.
-- Le secret AES-GCM correspondant doit être défini côté serveur sous AI_KEY_ENCRYPTION_SECRET.

CREATE TABLE IF NOT EXISTS public.user_ai_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('groq', 'openrouter', 'deepseek')),
  encrypted_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE public.user_ai_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_ai_keys FROM anon, authenticated;

DROP TRIGGER IF EXISTS user_ai_keys_updated_at ON public.user_ai_keys;
CREATE TRIGGER user_ai_keys_updated_at
  BEFORE UPDATE ON public.user_ai_keys
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id UUID REFERENCES public.missions(id) ON DELETE SET NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.credit_ledger FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS credit_ledger_user_created_idx
  ON public.credit_ledger(user_id, created_at DESC);

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

  -- Ensure a row exists, then lock it so concurrent retries serialize safely.
  INSERT INTO public.user_energy (id, current_energy, max_energy)
  VALUES (p_user_id, 50, 50)
  ON CONFLICT (id) DO NOTHING;

  SELECT current_energy
    INTO current_balance
    FROM public.user_energy
   WHERE id = p_user_id
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
    RAISE EXCEPTION 'Insufficient energy';
  END IF;

  UPDATE public.user_energy
     SET current_energy = current_balance - p_amount,
         updated_at = now()
   WHERE id = p_user_id;

  INSERT INTO public.credit_ledger(user_id, mission_id, idempotency_key, amount, reason)
  VALUES (p_user_id, p_mission_id, p_idempotency_key, p_amount, left(p_reason, 200));

  RETURN QUERY SELECT current_balance - p_amount, FALSE;
EXCEPTION
  WHEN unique_violation THEN
    -- Only a concurrent retry for this same user/key is idempotent.
    IF EXISTS (
      SELECT 1 FROM public.credit_ledger
       WHERE idempotency_key = p_idempotency_key
         AND user_id = p_user_id
    ) THEN
      SELECT current_energy INTO current_balance FROM public.user_energy WHERE id = p_user_id;
      RETURN QUERY SELECT current_balance, TRUE;
      RETURN;
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_credit(UUID, UUID, TEXT, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_credit(UUID, UUID, TEXT, INTEGER, TEXT) TO service_role;
