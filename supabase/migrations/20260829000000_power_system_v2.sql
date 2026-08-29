-- Power System V2 additive consolidation.
DROP FUNCTION IF EXISTS public.consume_power_points(UUID, UUID, TEXT, TEXT);
-- Supabase remains the authority. Browser roles still cannot mutate wallets or ledger rows directly.

ALTER TABLE public.power_wallets
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

UPDATE public.power_wallets
SET id = gen_random_uuid()
WHERE id IS NULL;

ALTER TABLE public.power_wallets
  ALTER COLUMN id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS power_wallets_id_unique
  ON public.power_wallets(id);

ALTER TABLE public.power_transactions
  ADD COLUMN IF NOT EXISTS wallet_id UUID,
  ADD COLUMN IF NOT EXISTS run_id UUID REFERENCES public.mission_agent_runs(id) ON DELETE SET NULL;

UPDATE public.power_transactions AS transaction
SET wallet_id = wallet.id
FROM public.power_wallets AS wallet
WHERE transaction.user_id = wallet.user_id
  AND transaction.wallet_id IS NULL;

ALTER TABLE public.power_transactions
  ALTER COLUMN wallet_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'power_transactions_wallet_id_fkey'
      AND conrelid = 'public.power_transactions'::regclass
  ) THEN
    ALTER TABLE public.power_transactions
      ADD CONSTRAINT power_transactions_wallet_id_fkey
      FOREIGN KEY (wallet_id) REFERENCES public.power_wallets(id) ON DELETE RESTRICT;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS power_transactions_wallet_created_idx
  ON public.power_transactions(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS power_transactions_run_created_idx
  ON public.power_transactions(run_id, created_at DESC)
  WHERE run_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.ensure_power_wallet(p_user_id UUID)
RETURNS TABLE (
  wallet_id UUID,
  user_id UUID,
  way TEXT,
  resource_label TEXT,
  balance INTEGER,
  wallet_cap INTEGER,
  plan_snapshot TEXT,
  policy_version TEXT,
  last_monthly_allocation_at TIMESTAMPTZ,
  last_way_change_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan TEXT;
  v_way TEXT;
  v_cap INTEGER;
  v_policy_version TEXT;
  v_seeded_balance INTEGER;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Power wallet user is required';
  END IF;

  SELECT profile.plan::text, profile.way::text INTO v_plan, v_way
  FROM public.profiles AS profile
  WHERE profile.id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile provisioning is incomplete';
  END IF;
  IF v_way NOT IN ('mage', 'ninja', 'hunter', 'professional') THEN
    RAISE EXCEPTION 'A completed Idealy Way is required';
  END IF;

  SELECT policy.wallet_cap, policy.policy_version INTO v_cap, v_policy_version
  FROM public.power_plan_policies AS policy
  WHERE policy.plan = v_plan AND policy.is_active = TRUE;
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

  SELECT wallet.id, wallet.user_id, v_way,
         CASE v_way
           WHEN 'mage' THEN 'Mana'
           WHEN 'ninja' THEN 'Chakra'
           WHEN 'hunter' THEN 'Nen'
           WHEN 'professional' THEN 'Énergie'
         END,
         wallet.balance, wallet.wallet_cap, wallet.plan_snapshot,
         wallet.policy_version, wallet.last_monthly_allocation_at,
         wallet.last_way_change_at, wallet.created_at, wallet.updated_at
    INTO wallet_id, user_id, way, resource_label, balance, wallet_cap,
         plan_snapshot, policy_version, last_monthly_allocation_at,
         last_way_change_at, created_at, updated_at
  FROM public.power_wallets AS wallet
  WHERE wallet.user_id = p_user_id
  FOR UPDATE;

  INSERT INTO public.power_transactions (
    user_id, wallet_id, idempotency_key, transaction_type, amount_points,
    balance_before, balance_after, reason, way_at_operation, policy_version
  ) VALUES (
    p_user_id, wallet_id, 'power-v1:opening:' || p_user_id::text,
    'opening_balance', balance, 0, balance,
    'Initialisation du wallet Power V1 depuis le solde géré existant',
    v_way, policy_version
  ) ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_power_status(p_action_type TEXT DEFAULT 'mission_simple')
RETURNS TABLE (
  wallet_id UUID,
  user_id UUID,
  way TEXT,
  resource_label TEXT,
  plan TEXT,
  balance INTEGER,
  wallet_cap INTEGER,
  policy_version TEXT,
  action_type TEXT,
  cost_points INTEGER,
  can_execute BOOLEAN,
  state TEXT,
  next_monthly_cycle TEXT,
  last_monthly_allocation_at TIMESTAMPTZ,
  last_way_change_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_wallet RECORD;
  v_cost INTEGER;
  v_action TEXT := lower(trim(COALESCE(p_action_type, 'mission_simple')));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  IF v_action NOT IN ('mission_simple', 'mission_squad') THEN
    RAISE EXCEPTION 'Invalid Power action type';
  END IF;

  SELECT * INTO v_wallet FROM public.ensure_power_wallet(v_user_id);

  SELECT policy.cost_points INTO v_cost
  FROM public.power_action_policies AS policy
  WHERE policy.action_type = v_action AND policy.is_active = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active Power action policy is unavailable';
  END IF;

  RETURN QUERY SELECT
    v_wallet.wallet_id,
    v_wallet.user_id,
    v_wallet.way,
    v_wallet.resource_label,
    v_wallet.plan_snapshot,
    v_wallet.balance,
    v_wallet.wallet_cap,
    v_wallet.policy_version,
    v_action,
    v_cost,
    v_wallet.balance >= v_cost,
    CASE
      WHEN v_wallet.balance = 0 THEN 'depleted'
      WHEN v_wallet.balance < v_cost THEN 'insufficient'
      WHEN v_wallet.balance < (v_cost * 2) THEN 'low'
      ELSE 'normal'
    END,
    to_char(date_trunc('month', now()) + interval '1 month', 'YYYY-MM'),
    v_wallet.last_monthly_allocation_at,
    v_wallet.last_way_change_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_power_points(
  p_user_id UUID,
  p_mission_id UUID,
  p_action_type TEXT,
  p_idempotency_key TEXT,
  p_run_id UUID DEFAULT NULL
)
RETURNS TABLE (
  transaction_id UUID,
  wallet_id UUID,
  power_remaining INTEGER,
  amount_charged INTEGER,
  already_charged BOOLEAN,
  way TEXT,
  resource_label TEXT,
  policy_version TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet RECORD;
  v_cost INTEGER;
  v_way TEXT;
  v_existing RECORD;
  v_transaction_id UUID;
  v_policy_version TEXT;
  v_key TEXT := trim(COALESCE(p_idempotency_key, ''));
  v_action TEXT := lower(trim(COALESCE(p_action_type, '')));
BEGIN
  IF p_user_id IS NULL OR length(v_key) = 0 OR length(v_key) > 200 THEN
    RAISE EXCEPTION 'Invalid Power debit identity';
  END IF;
  IF v_action NOT IN ('mission_simple', 'mission_squad') THEN
    RAISE EXCEPTION 'Invalid Power action type';
  END IF;
  IF p_mission_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.missions WHERE id = p_mission_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Mission does not belong to user';
  END IF;
  IF p_run_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.mission_agent_runs WHERE id = p_run_id AND user_id = p_user_id AND (p_mission_id IS NULL OR mission_id = p_mission_id)
  ) THEN
    RAISE EXCEPTION 'Mission run does not belong to user';
  END IF;

  SELECT * INTO v_wallet FROM public.ensure_power_wallet(p_user_id);

  SELECT transaction.id, transaction.user_id, transaction.wallet_id,
         transaction.balance_after, transaction.amount_points,
         transaction.way_at_operation, transaction.policy_version
    INTO v_existing
  FROM public.power_transactions AS transaction
  WHERE transaction.idempotency_key = v_key;
  IF FOUND THEN
    IF v_existing.user_id <> p_user_id THEN
      RAISE EXCEPTION 'Power idempotency key belongs to another user';
    END IF;
    RETURN QUERY SELECT
      v_existing.id,
      v_existing.wallet_id,
      v_existing.balance_after,
      abs(v_existing.amount_points),
      TRUE,
      COALESCE(v_existing.way_at_operation, v_wallet.way),
      CASE COALESCE(v_existing.way_at_operation, v_wallet.way)
        WHEN 'mage' THEN 'Mana'
        WHEN 'ninja' THEN 'Chakra'
        WHEN 'hunter' THEN 'Nen'
        WHEN 'professional' THEN 'Énergie'
      END,
      v_existing.policy_version;
    RETURN;
  END IF;

  SELECT policy.cost_points, policy.policy_version INTO v_cost, v_policy_version
  FROM public.power_action_policies AS policy
  WHERE policy.action_type = v_action AND policy.is_active = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active Power action policy is unavailable';
  END IF;

  SELECT profile.way::text INTO v_way FROM public.profiles AS profile WHERE profile.id = p_user_id;
  IF v_way NOT IN ('mage', 'ninja', 'hunter', 'professional') THEN
    RAISE EXCEPTION 'A completed Idealy Way is required';
  END IF;
  IF v_wallet.balance < v_cost THEN
    RAISE EXCEPTION 'Insufficient Power Points';
  END IF;

  UPDATE public.power_wallets AS wallet
  SET balance = wallet.balance - v_cost,
      updated_at = now()
  WHERE wallet.user_id = p_user_id
    AND wallet.balance >= v_cost
  RETURNING wallet.balance INTO v_wallet.balance;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient Power Points';
  END IF;

  INSERT INTO public.power_transactions (
    user_id, wallet_id, mission_id, run_id, idempotency_key, transaction_type, action_type,
    amount_points, balance_before, balance_after, reason, way_at_operation,
    policy_version
  ) VALUES (
    p_user_id, v_wallet.wallet_id, p_mission_id, p_run_id, v_key,
    'consumption', v_action, -v_cost, v_wallet.balance + v_cost,
    v_wallet.balance,
    CASE v_action
      WHEN 'mission_simple' THEN 'Mission IA simple'
      WHEN 'mission_squad' THEN 'Mission d’escouade multi-agents'
    END,
    v_way, v_policy_version
  ) RETURNING id INTO v_transaction_id;

  RETURN QUERY SELECT v_transaction_id, v_wallet.wallet_id, v_wallet.balance, v_cost, FALSE,
    v_way,
    CASE v_way WHEN 'mage' THEN 'Mana' WHEN 'ninja' THEN 'Chakra' WHEN 'hunter' THEN 'Nen' WHEN 'professional' THEN 'Énergie' END,
    v_policy_version;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_monthly_power(
  p_user_id UUID,
  p_cycle TEXT DEFAULT NULL
)
RETURNS TABLE (
  transaction_id UUID,
  wallet_id UUID,
  power_balance INTEGER,
  allocation_delta INTEGER,
  already_allocated BOOLEAN,
  cycle TEXT,
  policy_version TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet RECORD;
  v_allocation INTEGER;
  v_cap INTEGER;
  v_policy_version TEXT;
  v_cycle TEXT := COALESCE(NULLIF(trim(p_cycle), ''), to_char(date_trunc('month', now()), 'YYYY-MM'));
  v_key TEXT;
  v_existing RECORD;
  v_new_balance INTEGER;
  v_delta INTEGER;
  v_transaction_id UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Power wallet user is required';
  END IF;
  IF v_cycle !~ '^\d{4}-\d{2}$' THEN
    RAISE EXCEPTION 'Invalid Power monthly cycle';
  END IF;

  SELECT * INTO v_wallet FROM public.ensure_power_wallet(p_user_id);
  v_key := 'power-v1:monthly:' || p_user_id::text || ':' || v_cycle;

  SELECT transaction.id, transaction.user_id, transaction.wallet_id,
         transaction.balance_after, transaction.amount_points, transaction.policy_version
    INTO v_existing
  FROM public.power_transactions AS transaction
  WHERE transaction.idempotency_key = v_key;
  IF FOUND THEN
    IF v_existing.user_id <> p_user_id THEN
      RAISE EXCEPTION 'Power idempotency key belongs to another user';
    END IF;
    RETURN QUERY SELECT v_existing.id, v_existing.wallet_id, v_existing.balance_after,
      v_existing.amount_points, TRUE, v_cycle, v_existing.policy_version;
    RETURN;
  END IF;

  SELECT policy.monthly_allocation, policy.wallet_cap, policy.policy_version
    INTO v_allocation, v_cap, v_policy_version
  FROM public.power_plan_policies AS policy
  WHERE policy.plan = (SELECT profile.plan::text FROM public.profiles AS profile WHERE profile.id = p_user_id)
    AND policy.is_active = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active Power policy is unavailable';
  END IF;

  v_new_balance := LEAST(v_cap, v_wallet.balance + v_allocation);
  v_delta := v_new_balance - v_wallet.balance;

  UPDATE public.power_wallets
  SET balance = v_new_balance,
      wallet_cap = v_cap,
      plan_snapshot = (SELECT profile.plan::text FROM public.profiles AS profile WHERE profile.id = p_user_id),
      policy_version = v_policy_version,
      last_monthly_allocation_at = now(),
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.power_transactions (
    user_id, wallet_id, idempotency_key, transaction_type, amount_points,
    balance_before, balance_after, reason, way_at_operation, policy_version, metadata
  ) VALUES (
    p_user_id, v_wallet.wallet_id, v_key, 'monthly_allocation', v_delta,
    v_wallet.balance, v_new_balance,
    'Allocation mensuelle Power du cycle ' || v_cycle,
    v_wallet.way, v_policy_version, jsonb_build_object('cycle', v_cycle)
  ) RETURNING id INTO v_transaction_id;

  RETURN QUERY SELECT v_transaction_id, v_wallet.wallet_id, v_new_balance, v_delta, FALSE, v_cycle, v_policy_version;
END;
$$;

CREATE OR REPLACE FUNCTION public.change_my_power_way(
  p_way TEXT,
  p_idempotency_key TEXT
)
RETURNS TABLE (
  transaction_id UUID,
  wallet_id UUID,
  way TEXT,
  resource_label TEXT,
  power_balance INTEGER,
  changed BOOLEAN,
  policy_version TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_previous_way TEXT;
  v_wallet RECORD;
  v_existing RECORD;
  v_transaction_id UUID;
  v_policy_version TEXT;
  v_key TEXT := trim(COALESCE(p_idempotency_key, ''));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  p_way := lower(trim(COALESCE(p_way, '')));
  IF p_way NOT IN ('mage', 'ninja', 'hunter', 'professional') THEN
    RAISE EXCEPTION 'Invalid Power Way';
  END IF;
  IF length(v_key) = 0 OR length(v_key) > 200 THEN
    RAISE EXCEPTION 'Invalid Power Way change identity';
  END IF;

  SELECT profile.way::text INTO v_previous_way
  FROM public.profiles AS profile
  WHERE profile.id = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile provisioning is incomplete';
  END IF;

  SELECT * INTO v_wallet FROM public.ensure_power_wallet(v_user_id);

  SELECT transaction.id, transaction.user_id, transaction.wallet_id,
         transaction.balance_after, transaction.policy_version
    INTO v_existing
  FROM public.power_transactions AS transaction
  WHERE transaction.idempotency_key = v_key;
  IF FOUND THEN
    IF v_existing.user_id <> v_user_id THEN
      RAISE EXCEPTION 'Power idempotency key belongs to another user';
    END IF;
    RETURN QUERY SELECT v_existing.id, v_existing.wallet_id,
      (SELECT profile.way::text FROM public.profiles AS profile WHERE profile.id = v_user_id),
      CASE (SELECT profile.way::text FROM public.profiles AS profile WHERE profile.id = v_user_id)
        WHEN 'mage' THEN 'Mana' WHEN 'ninja' THEN 'Chakra' WHEN 'hunter' THEN 'Nen' WHEN 'professional' THEN 'Énergie'
      END,
      v_existing.balance_after, TRUE, v_existing.policy_version;
    RETURN;
  END IF;

  IF v_previous_way = p_way THEN
    RETURN QUERY SELECT NULL::UUID, v_wallet.wallet_id, v_previous_way, v_wallet.resource_label,
      v_wallet.balance, FALSE, v_wallet.policy_version;
    RETURN;
  END IF;
  IF v_wallet.last_way_change_at IS NOT NULL
    AND v_wallet.last_way_change_at > now() - interval '30 days' THEN
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
    user_id, wallet_id, idempotency_key, transaction_type, amount_points,
    balance_before, balance_after, reason, way_at_operation, policy_version, metadata
  ) VALUES (
    v_user_id, v_wallet.wallet_id, v_key, 'way_change', 0,
    v_wallet.balance, v_wallet.balance, 'Changement de Voie Power', p_way,
    v_wallet.policy_version, jsonb_build_object('previous_way', v_previous_way, 'conversion', 'À DÉFINIR')
  ) RETURNING id INTO v_transaction_id;

  RETURN QUERY SELECT v_transaction_id, v_wallet.wallet_id, p_way,
    CASE p_way WHEN 'mage' THEN 'Mana' WHEN 'ninja' THEN 'Chakra' WHEN 'hunter' THEN 'Nen' WHEN 'professional' THEN 'Énergie' END,
    v_wallet.balance, TRUE, v_wallet.policy_version;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_power_status(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_power_status(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.ensure_power_wallet(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_power_points(UUID, UUID, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_monthly_power(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.change_my_power_way(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_power_wallet(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_power_points(UUID, UUID, TEXT, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_monthly_power(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.change_my_power_way(TEXT, TEXT) TO authenticated;
