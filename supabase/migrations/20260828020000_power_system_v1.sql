-- Power System V1. This is additive: legacy user_credits / credit_ledger remain
-- untouched so the cutover to Power can be explicit and auditable.

CREATE TABLE IF NOT EXISTS public.power_plan_policies (
  policy_version TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'pro', 'business')),
  monthly_allocation INTEGER NOT NULL CHECK (monthly_allocation >= 0),
  wallet_cap INTEGER NOT NULL CHECK (wallet_cap >= 0),
  renewal_cadence TEXT NOT NULL CHECK (renewal_cadence = 'monthly'),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (policy_version, plan)
);

CREATE UNIQUE INDEX IF NOT EXISTS power_plan_policies_one_active_plan_idx
  ON public.power_plan_policies(plan)
  WHERE is_active;

CREATE TABLE IF NOT EXISTS public.power_action_policies (
  policy_version TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('mission_simple', 'mission_squad')),
  cost_points INTEGER NOT NULL CHECK (cost_points > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (policy_version, action_type)
);

CREATE UNIQUE INDEX IF NOT EXISTS power_action_policies_one_active_action_idx
  ON public.power_action_policies(action_type)
  WHERE is_active;

INSERT INTO public.power_plan_policies (
  policy_version, plan, monthly_allocation, wallet_cap, renewal_cadence
)
VALUES
  ('power-v1', 'free', 100, 100, 'monthly'),
  ('power-v1', 'pro', 1000, 1000, 'monthly'),
  ('power-v1', 'business', 3000, 3000, 'monthly')
ON CONFLICT (policy_version, plan) DO NOTHING;

INSERT INTO public.power_action_policies (policy_version, action_type, cost_points)
VALUES
  ('power-v1', 'mission_simple', 10),
  ('power-v1', 'mission_squad', 50)
ON CONFLICT (policy_version, action_type) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.power_wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  wallet_cap INTEGER NOT NULL CHECK (wallet_cap >= 0),
  plan_snapshot TEXT NOT NULL CHECK (plan_snapshot IN ('free', 'pro', 'business')),
  policy_version TEXT NOT NULL,
  legacy_seeded_balance INTEGER NOT NULL DEFAULT 0 CHECK (legacy_seeded_balance >= 0),
  last_monthly_allocation_at TIMESTAMPTZ,
  last_way_change_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (balance <= wallet_cap)
);

CREATE TABLE IF NOT EXISTS public.power_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id UUID REFERENCES public.missions(id) ON DELETE SET NULL,
  idempotency_key TEXT NOT NULL UNIQUE CHECK (length(trim(idempotency_key)) BETWEEN 1 AND 200),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('opening_balance', 'monthly_allocation', 'consumption', 'way_change')),
  action_type TEXT CHECK (action_type IS NULL OR action_type IN ('mission_simple', 'mission_squad')),
  amount_points INTEGER NOT NULL,
  balance_before INTEGER NOT NULL CHECK (balance_before >= 0),
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 200),
  way_at_operation TEXT CHECK (way_at_operation IS NULL OR way_at_operation IN ('mage', 'ninja', 'hunter', 'professional')),
  policy_version TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (transaction_type = 'consumption' AND amount_points < 0 AND action_type IS NOT NULL AND way_at_operation IS NOT NULL)
    OR (transaction_type = 'way_change' AND amount_points = 0 AND action_type IS NULL AND way_at_operation IS NOT NULL)
    OR (transaction_type IN ('opening_balance', 'monthly_allocation') AND action_type IS NULL)
  ),
  CHECK (balance_after = balance_before + amount_points)
);

CREATE INDEX IF NOT EXISTS power_transactions_user_created_idx
  ON public.power_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS power_transactions_mission_created_idx
  ON public.power_transactions(mission_id, created_at DESC)
  WHERE mission_id IS NOT NULL;

ALTER TABLE public.power_plan_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_action_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_transactions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.power_plan_policies FROM anon, authenticated;
REVOKE ALL ON TABLE public.power_action_policies FROM anon, authenticated;
REVOKE ALL ON TABLE public.power_wallets FROM anon, authenticated;
REVOKE ALL ON TABLE public.power_transactions FROM anon, authenticated;

DROP TRIGGER IF EXISTS power_plan_policies_updated_at ON public.power_plan_policies;
CREATE TRIGGER power_plan_policies_updated_at
  BEFORE UPDATE ON public.power_plan_policies
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS power_action_policies_updated_at ON public.power_action_policies;
CREATE TRIGGER power_action_policies_updated_at
  BEFORE UPDATE ON public.power_action_policies
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS power_wallets_updated_at ON public.power_wallets;
CREATE TRIGGER power_wallets_updated_at
  BEFORE UPDATE ON public.power_wallets
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Seed exactly once from the legacy managed balance. This neither changes the
-- legacy balance nor creates a new allocation; it preserves the smaller of the
-- legacy amount and the approved cap while later Power mutations use this ledger.
INSERT INTO public.power_wallets (
  user_id, balance, wallet_cap, plan_snapshot, policy_version, legacy_seeded_balance
)
SELECT
  profile.id,
  LEAST(
    GREATEST(COALESCE(credits.balance, energy.current_energy, 0), 0),
    plan_policy.wallet_cap
  ),
  plan_policy.wallet_cap,
  profile.plan::text,
  plan_policy.policy_version,
  LEAST(
    GREATEST(COALESCE(credits.balance, energy.current_energy, 0), 0),
    plan_policy.wallet_cap
  )
FROM public.profiles AS profile
JOIN public.power_plan_policies AS plan_policy
  ON plan_policy.plan = profile.plan::text
 AND plan_policy.is_active = TRUE
LEFT JOIN public.user_credits AS credits ON credits.user_id = profile.id
LEFT JOIN public.user_energy AS energy ON energy.id = profile.id
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.power_transactions (
  user_id, idempotency_key, transaction_type, amount_points, balance_before,
  balance_after, reason, policy_version
)
SELECT
  wallet.user_id,
  'power-v1:opening:' || wallet.user_id::text,
  'opening_balance',
  wallet.balance,
  0,
  wallet.balance,
  'Initialisation du wallet Power V1 depuis le solde géré existant',
  wallet.policy_version
FROM public.power_wallets AS wallet
ON CONFLICT (idempotency_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.ensure_power_wallet(p_user_id UUID)
RETURNS TABLE (
  balance INTEGER,
  wallet_cap INTEGER,
  plan_snapshot TEXT,
  policy_version TEXT,
  last_way_change_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan TEXT;
  v_cap INTEGER;
  v_policy_version TEXT;
  v_seeded_balance INTEGER;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Power wallet user is required';
  END IF;

  SELECT plan::text INTO v_plan
  FROM public.profiles
  WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile provisioning is incomplete';
  END IF;

  SELECT wallet_cap, policy_version INTO v_cap, v_policy_version
  FROM public.power_plan_policies
  WHERE plan = v_plan AND is_active = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active Power policy is unavailable';
  END IF;

  SELECT LEAST(
    GREATEST(COALESCE(credits.balance, energy.current_energy, 0), 0),
    v_cap
  ) INTO v_seeded_balance
  FROM public.profiles AS profile
  LEFT JOIN public.user_credits AS credits ON credits.user_id = profile.id
  LEFT JOIN public.user_energy AS energy ON energy.id = profile.id
  WHERE profile.id = p_user_id;

  INSERT INTO public.power_wallets (
    user_id, balance, wallet_cap, plan_snapshot, policy_version, legacy_seeded_balance
  ) VALUES (
    p_user_id, v_seeded_balance, v_cap, v_plan, v_policy_version, v_seeded_balance
  ) ON CONFLICT (user_id) DO NOTHING;

  SELECT wallet.balance, wallet.wallet_cap, wallet.plan_snapshot,
         wallet.policy_version, wallet.last_way_change_at
    INTO balance, wallet_cap, plan_snapshot, policy_version, last_way_change_at
  FROM public.power_wallets AS wallet
  WHERE wallet.user_id = p_user_id
  FOR UPDATE;

  INSERT INTO public.power_transactions (
    user_id, idempotency_key, transaction_type, amount_points, balance_before,
    balance_after, reason, policy_version
  ) VALUES (
    p_user_id,
    'power-v1:opening:' || p_user_id::text,
    'opening_balance',
    balance,
    0,
    balance,
    'Initialisation du wallet Power V1 depuis le solde géré existant',
    policy_version
  ) ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_power_points(
  p_user_id UUID,
  p_mission_id UUID,
  p_action_type TEXT,
  p_idempotency_key TEXT
)
RETURNS TABLE (
  power_remaining INTEGER,
  amount_charged INTEGER,
  already_charged BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
  v_cap INTEGER;
  v_plan TEXT;
  v_policy_version TEXT;
  v_last_way_change TIMESTAMPTZ;
  v_cost INTEGER;
  v_way TEXT;
  v_existing_user UUID;
BEGIN
  IF p_user_id IS NULL OR p_idempotency_key IS NULL
    OR length(trim(p_idempotency_key)) = 0 OR length(trim(p_idempotency_key)) > 200 THEN
    RAISE EXCEPTION 'Invalid Power debit identity';
  END IF;
  IF p_action_type NOT IN ('mission_simple', 'mission_squad') THEN
    RAISE EXCEPTION 'Invalid Power action type';
  END IF;
  IF p_mission_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.missions WHERE id = p_mission_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Mission does not belong to user';
  END IF;

  SELECT balance, wallet_cap, plan_snapshot, policy_version, last_way_change_at
    INTO v_balance, v_cap, v_plan, v_policy_version, v_last_way_change
  FROM public.ensure_power_wallet(p_user_id);

  SELECT user_id INTO v_existing_user
  FROM public.power_transactions
  WHERE idempotency_key = p_idempotency_key;
  IF v_existing_user IS NOT NULL AND v_existing_user <> p_user_id THEN
    RAISE EXCEPTION 'Power idempotency key belongs to another user';
  END IF;
  IF v_existing_user = p_user_id THEN
    RETURN QUERY SELECT v_balance, 0, TRUE;
    RETURN;
  END IF;

  SELECT cost_points, policy_version INTO v_cost, v_policy_version
  FROM public.power_action_policies
  WHERE action_type = p_action_type AND is_active = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active Power action policy is unavailable';
  END IF;
  SELECT way INTO v_way
  FROM public.profiles
  WHERE id = p_user_id;
  IF v_way NOT IN ('mage', 'ninja', 'hunter', 'professional') THEN
    RAISE EXCEPTION 'A completed Idealy Way is required';
  END IF;
  IF v_balance < v_cost THEN
    RAISE EXCEPTION 'Insufficient Power Points';
  END IF;

  UPDATE public.power_wallets
  SET balance = v_balance - v_cost,
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.power_transactions (
    user_id, mission_id, idempotency_key, transaction_type, action_type,
    amount_points, balance_before, balance_after, reason, way_at_operation,
    policy_version
  ) VALUES (
    p_user_id,
    p_mission_id,
    trim(p_idempotency_key),
    'consumption',
    p_action_type,
    -v_cost,
    v_balance,
    v_balance - v_cost,
    CASE p_action_type
      WHEN 'mission_simple' THEN 'Mission IA simple'
      WHEN 'mission_squad' THEN 'Mission d’escouade multi-agents'
    END,
    v_way,
    v_policy_version
  );

  RETURN QUERY SELECT v_balance - v_cost, v_cost, FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_monthly_power(
  p_user_id UUID,
  p_idempotency_key TEXT
)
RETURNS TABLE (
  power_balance INTEGER,
  allocation_delta INTEGER,
  already_allocated BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
  v_cap INTEGER;
  v_plan TEXT;
  v_policy_version TEXT;
  v_last_way_change TIMESTAMPTZ;
  v_allocation INTEGER;
  v_existing_user UUID;
BEGIN
  IF p_user_id IS NULL OR p_idempotency_key IS NULL
    OR length(trim(p_idempotency_key)) = 0 OR length(trim(p_idempotency_key)) > 200 THEN
    RAISE EXCEPTION 'Invalid monthly Power allocation identity';
  END IF;

  SELECT balance, wallet_cap, plan_snapshot, policy_version, last_way_change_at
    INTO v_balance, v_cap, v_plan, v_policy_version, v_last_way_change
  FROM public.ensure_power_wallet(p_user_id);

  SELECT user_id INTO v_existing_user
  FROM public.power_transactions
  WHERE idempotency_key = p_idempotency_key;
  IF v_existing_user IS NOT NULL AND v_existing_user <> p_user_id THEN
    RAISE EXCEPTION 'Power idempotency key belongs to another user';
  END IF;
  IF v_existing_user = p_user_id THEN
    RETURN QUERY SELECT v_balance, 0, TRUE;
    RETURN;
  END IF;

  SELECT monthly_allocation, wallet_cap, policy_version
    INTO v_allocation, v_cap, v_policy_version
  FROM public.power_plan_policies
  WHERE plan = (SELECT plan::text FROM public.profiles WHERE id = p_user_id)
    AND is_active = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active Power policy is unavailable';
  END IF;
  v_plan := (SELECT plan::text FROM public.profiles WHERE id = p_user_id);
  IF (SELECT last_monthly_allocation_at FROM public.power_wallets WHERE user_id = p_user_id)
    >= date_trunc('month', now()) THEN
    RAISE EXCEPTION 'Power monthly allocation already granted for current cycle';
  END IF;

  UPDATE public.power_wallets
  SET balance = v_allocation,
      wallet_cap = v_cap,
      plan_snapshot = v_plan,
      policy_version = v_policy_version,
      last_monthly_allocation_at = now(),
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.power_transactions (
    user_id, idempotency_key, transaction_type, amount_points, balance_before,
    balance_after, reason, policy_version
  ) VALUES (
    p_user_id,
    trim(p_idempotency_key),
    'monthly_allocation',
    v_allocation - v_balance,
    v_balance,
    v_allocation,
    'Allocation mensuelle Power du plan ' || v_plan,
    v_policy_version
  );

  RETURN QUERY SELECT v_allocation, v_allocation - v_balance, FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.change_my_power_way(
  p_way TEXT,
  p_idempotency_key TEXT
)
RETURNS TABLE (
  way TEXT,
  power_balance INTEGER,
  changed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_previous_way TEXT;
  v_balance INTEGER;
  v_cap INTEGER;
  v_plan TEXT;
  v_policy_version TEXT;
  v_last_way_change TIMESTAMPTZ;
  v_existing_user UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  p_way := lower(trim(COALESCE(p_way, '')));
  IF p_way NOT IN ('mage', 'ninja', 'hunter', 'professional') THEN
    RAISE EXCEPTION 'Invalid Power Way';
  END IF;
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0
    OR length(trim(p_idempotency_key)) > 200 THEN
    RAISE EXCEPTION 'Invalid Power Way change identity';
  END IF;

  SELECT way INTO v_previous_way
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile provisioning is incomplete';
  END IF;

  SELECT balance, wallet_cap, plan_snapshot, policy_version, last_way_change_at
    INTO v_balance, v_cap, v_plan, v_policy_version, v_last_way_change
  FROM public.ensure_power_wallet(v_user_id);

  SELECT user_id INTO v_existing_user
  FROM public.power_transactions
  WHERE idempotency_key = p_idempotency_key;
  IF v_existing_user IS NOT NULL AND v_existing_user <> v_user_id THEN
    RAISE EXCEPTION 'Power idempotency key belongs to another user';
  END IF;
  IF v_existing_user = v_user_id THEN
    RETURN QUERY SELECT (SELECT way FROM public.profiles WHERE id = v_user_id), v_balance, TRUE;
    RETURN;
  END IF;
  IF v_previous_way = p_way THEN
    RETURN QUERY SELECT v_previous_way, v_balance, FALSE;
    RETURN;
  END IF;
  IF v_last_way_change IS NOT NULL
    AND v_last_way_change > now() - interval '30 days' THEN
    RAISE EXCEPTION 'Power Way change cooldown is active';
  END IF;

  UPDATE public.profiles
  SET way = p_way,
      updated_at = now()
  WHERE id = v_user_id;
  UPDATE public.power_wallets
  SET last_way_change_at = now(),
      updated_at = now()
  WHERE user_id = v_user_id;
  INSERT INTO public.power_transactions (
    user_id, idempotency_key, transaction_type, amount_points, balance_before,
    balance_after, reason, way_at_operation, policy_version, metadata
  ) VALUES (
    v_user_id,
    trim(p_idempotency_key),
    'way_change',
    0,
    v_balance,
    v_balance,
    'Changement de Voie Power',
    p_way,
    v_policy_version,
    jsonb_build_object('previous_way', v_previous_way)
  );

  RETURN QUERY SELECT p_way, v_balance, TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_power_wallet(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_power_points(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_monthly_power(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.change_my_power_way(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_power_wallet(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_power_points(UUID, UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_monthly_power(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.change_my_power_way(TEXT, TEXT) TO authenticated;
