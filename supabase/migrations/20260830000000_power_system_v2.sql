-- Power System V2: authenticated read boundary for the canonical Power wallet.
-- Legacy credits remain separate and are never used as the mutation authority.

CREATE OR REPLACE FUNCTION public.get_my_power_status(p_action_type TEXT DEFAULT NULL)
RETURNS TABLE (
  balance INTEGER,
  wallet_cap INTEGER,
  plan TEXT,
  way TEXT,
  resource_label TEXT,
  policy_version TEXT,
  action_type TEXT,
  cost_points INTEGER,
  can_execute BOOLEAN,
  last_monthly_allocation_at TIMESTAMPTZ,
  last_way_change_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_action TEXT := NULLIF(lower(trim(COALESCE(p_action_type, ''))), '');
  v_wallet RECORD;
  v_profile RECORD;
  v_cost INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  IF v_action IS NOT NULL AND v_action NOT IN ('mission_simple', 'mission_squad') THEN
    RAISE EXCEPTION 'Invalid Power action type';
  END IF;

  SELECT * INTO v_wallet FROM public.ensure_power_wallet(v_user_id);
  SELECT p.plan::TEXT, p.way::TEXT INTO v_profile
  FROM public.profiles AS p
  WHERE p.id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile provisioning is incomplete';
  END IF;

  IF v_action IS NOT NULL THEN
    SELECT ap.cost_points INTO v_cost
    FROM public.power_action_policies AS ap
    WHERE ap.action_type = v_action AND ap.is_active = TRUE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Active Power action policy is unavailable';
    END IF;
  END IF;

  RETURN QUERY SELECT
    v_wallet.balance,
    v_wallet.wallet_cap,
    v_profile.plan,
    v_profile.way,
    CASE v_profile.way
      WHEN 'mage' THEN 'Mana'
      WHEN 'ninja' THEN 'Chakra'
      WHEN 'hunter' THEN 'Nen'
      WHEN 'professional' THEN 'Énergie'
      ELSE 'Power'
    END,
    v_wallet.policy_version,
    v_action,
    v_cost,
    v_action IS NULL OR v_wallet.balance >= v_cost,
    (SELECT w.last_monthly_allocation_at FROM public.power_wallets AS w WHERE w.user_id = v_user_id),
    v_wallet.last_way_change_at;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_power_status(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_power_status(TEXT) TO authenticated;
