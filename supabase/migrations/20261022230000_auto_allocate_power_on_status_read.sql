-- Lazily allocate the plan's monthly Power to onboarded users when their
-- authenticated wallet is read. This covers the initial allocation and monthly
-- renewal without requiring a missing cron job or relying on a browser-side counter.

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
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_action TEXT := NULLIF(lower(trim(COALESCE(p_action_type, ''))), '');
  v_wallet RECORD;
  v_profile RECORD;
  v_cost INTEGER;
  v_last_monthly_allocation_at TIMESTAMPTZ;
  v_month_key TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  IF v_action IS NOT NULL AND v_action NOT IN ('mission_simple', 'mission_squad') THEN
    RAISE EXCEPTION 'Invalid Power action type';
  END IF;

  SELECT * INTO v_wallet FROM public.ensure_power_wallet(v_user_id);

  SELECT profile.plan::TEXT, profile.way::TEXT, profile.onboarding_completed
    INTO v_profile
    FROM public.profiles AS profile
   WHERE profile.id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile provisioning is incomplete';
  END IF;

  SELECT wallet.last_monthly_allocation_at
    INTO v_last_monthly_allocation_at
    FROM public.power_wallets AS wallet
   WHERE wallet.user_id = v_user_id;

  -- Only completed profiles receive Power. The database timestamp and a
  -- per-month idempotency key prevent repeated page loads from allocating twice.
  IF v_profile.onboarding_completed IS TRUE
     AND v_profile.way IN ('mage', 'ninja', 'hunter', 'professional')
     AND (
       v_last_monthly_allocation_at IS NULL
       OR v_last_monthly_allocation_at < date_trunc('month', now())
     ) THEN
    v_month_key := 'power:monthly:' || v_user_id::TEXT || ':' ||
      to_char(date_trunc('month', now()), 'YYYY-MM');

    BEGIN
      PERFORM * FROM public.grant_monthly_power(v_user_id, v_month_key);
    EXCEPTION WHEN OTHERS THEN
      -- Concurrent reads can reach this branch together. The first one grants
      -- the allocation; the later one should observe the same cycle as complete.
      IF SQLERRM <> 'Power monthly allocation already granted for current cycle' THEN
        RAISE;
      END IF;
    END;

    SELECT * INTO v_wallet FROM public.ensure_power_wallet(v_user_id);
    SELECT wallet.last_monthly_allocation_at
      INTO v_last_monthly_allocation_at
      FROM public.power_wallets AS wallet
     WHERE wallet.user_id = v_user_id;
  END IF;

  IF v_action IS NOT NULL THEN
    SELECT policy.cost_points
      INTO v_cost
      FROM public.power_action_policies AS policy
     WHERE policy.action_type = v_action
       AND policy.is_active = TRUE;
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
    v_last_monthly_allocation_at,
    v_wallet.last_way_change_at;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_my_power_status(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_power_status(TEXT) TO authenticated;
