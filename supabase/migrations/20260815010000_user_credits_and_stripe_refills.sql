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

-- ─── Power Pack purchase ───────────────────────────────────────────────────
-- Stripe previously credited public.user_credits while missions spend from
-- public.power_wallets: a paid purchase never produced usable Power. Purchases
-- now credit the Power wallet, which is the single consumption authority.
--
-- The credit is capped by the wallet cap, so buying more raises the balance up
-- to the ceiling rather than inventing an unbounded amount. The full price and
-- pack identity stay in the ledger metadata for reconciliation with Stripe.

CREATE OR REPLACE FUNCTION public.grant_power_pack(
  p_user_id UUID,
  p_pack_id TEXT,
  p_amount INTEGER,
  p_idempotency_key TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  balance INTEGER,
  amount_granted INTEGER,
  already_granted BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet RECORD;
  v_headroom INTEGER;
  v_granted INTEGER;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid Power purchase user';
  END IF;
  IF p_pack_id IS NULL OR length(trim(p_pack_id)) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'Invalid Power pack identity';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 100000 THEN
    RAISE EXCEPTION 'Invalid Power pack amount';
  END IF;
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Invalid Power purchase idempotency key';
  END IF;

  -- An idempotency key may never be replayed against a different account.
  IF EXISTS (
    SELECT 1 FROM public.power_transactions
    WHERE idempotency_key = p_idempotency_key AND user_id <> p_user_id
  ) THEN
    RAISE EXCEPTION 'Power idempotency key belongs to another user';
  END IF;

  SELECT balance, wallet_cap, policy_version
    INTO v_wallet
    FROM public.ensure_power_wallet(p_user_id)
    FOR UPDATE;

  -- Replaying the same Stripe event must never credit twice.
  IF EXISTS (
    SELECT 1 FROM public.power_transactions WHERE idempotency_key = p_idempotency_key
  ) THEN
    RETURN QUERY SELECT v_wallet.balance, 0, TRUE;
    RETURN;
  END IF;

  v_headroom := GREATEST(v_wallet.wallet_cap - v_wallet.balance, 0);
  v_granted := LEAST(p_amount, v_headroom);

  IF v_granted > 0 THEN
    UPDATE public.power_wallets
      SET balance = v_wallet.balance + v_granted,
          updated_at = now()
      WHERE user_id = p_user_id;

    INSERT INTO public.power_transactions (
      user_id, mission_id, idempotency_key, transaction_type, action_type,
      amount_points, balance_before, balance_after, reason,
      way_at_operation, policy_version, metadata
    ) VALUES (
      p_user_id, NULL, trim(p_idempotency_key), 'power_pack_purchase', NULL,
      v_granted, v_wallet.balance, v_wallet.balance + v_granted,
      left('Power Pack: ' || trim(p_pack_id), 200),
      NULL, v_wallet.policy_version,
      p_metadata || jsonb_build_object('pack_id', trim(p_pack_id), 'requested_amount', p_amount)
    );
  END IF;

  -- The purchase is always journalled, even at the cap, so a refused amount is
  -- auditable instead of silently vanishing.
  IF v_granted = 0 THEN
    INSERT INTO public.power_transactions (
      user_id, mission_id, idempotency_key, transaction_type, action_type,
      amount_points, balance_before, balance_after, reason,
      way_at_operation, policy_version, metadata
    ) VALUES (
      p_user_id, NULL, trim(p_idempotency_key), 'power_pack_purchase', NULL,
      0, v_wallet.balance, v_wallet.balance,
      left('Power Pack refusé (plafond atteint): ' || trim(p_pack_id), 200),
      NULL, v_wallet.policy_version,
      p_metadata || jsonb_build_object('pack_id', trim(p_pack_id), 'refused_reason', 'wallet_cap_reached')
    );
  END IF;

  RETURN QUERY SELECT v_wallet.balance + v_granted, v_granted, FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_power_pack(UUID, TEXT, INTEGER, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_power_pack(UUID, TEXT, INTEGER, TEXT, JSONB) TO service_role;

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
