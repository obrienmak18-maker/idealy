DO $$
DECLARE
  consume_definition TEXT;
  ensure_definition TEXT;
  monthly_definition TEXT;
  way_change_definition TEXT;
BEGIN
  IF to_regclass('public.power_plan_policies') IS NULL
    OR to_regclass('public.power_action_policies') IS NULL
    OR to_regclass('public.power_wallets') IS NULL
    OR to_regclass('public.power_transactions') IS NULL THEN
    RAISE EXCEPTION 'Power System V1 tables are missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid = 'public.power_wallets'::regclass AND relrowsecurity
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid = 'public.power_transactions'::regclass AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Power wallet and transaction RLS must be enabled';
  END IF;

  IF has_table_privilege('authenticated', 'public.power_wallets', 'SELECT')
    OR has_table_privilege('authenticated', 'public.power_wallets', 'INSERT')
    OR has_table_privilege('authenticated', 'public.power_transactions', 'SELECT')
    OR has_table_privilege('authenticated', 'public.power_transactions', 'INSERT') THEN
    RAISE EXCEPTION 'authenticated must not directly access Power tables';
  END IF;

  IF (SELECT monthly_allocation FROM public.power_plan_policies WHERE policy_version = 'power-v1' AND plan = 'free') <> 100
    OR (SELECT wallet_cap FROM public.power_plan_policies WHERE policy_version = 'power-v1' AND plan = 'free') <> 100
    OR (SELECT monthly_allocation FROM public.power_plan_policies WHERE policy_version = 'power-v1' AND plan = 'pro') <> 1000
    OR (SELECT wallet_cap FROM public.power_plan_policies WHERE policy_version = 'power-v1' AND plan = 'pro') <> 1000
    OR (SELECT monthly_allocation FROM public.power_plan_policies WHERE policy_version = 'power-v1' AND plan = 'business') <> 3000
    OR (SELECT wallet_cap FROM public.power_plan_policies WHERE policy_version = 'power-v1' AND plan = 'business') <> 3000 THEN
    RAISE EXCEPTION 'Power V1 allocations or caps do not match approved policy';
  END IF;

  IF (SELECT cost_points FROM public.power_action_policies WHERE policy_version = 'power-v1' AND action_type = 'mission_simple') <> 10
    OR (SELECT cost_points FROM public.power_action_policies WHERE policy_version = 'power-v1' AND action_type = 'mission_squad') <> 50 THEN
    RAISE EXCEPTION 'Power V1 action costs do not match approved policy';
  END IF;

  IF to_regprocedure('public.ensure_power_wallet(uuid)') IS NULL
    OR to_regprocedure('public.consume_power_points(uuid,uuid,text,text,uuid)') IS NULL
    OR to_regprocedure('public.get_my_power_status(text)') IS NULL
    OR to_regprocedure('public.grant_monthly_power(uuid,text)') IS NULL
    OR to_regprocedure('public.change_my_power_way(text,text)') IS NULL THEN
    RAISE EXCEPTION 'Power mutation functions are missing';
  END IF;

  IF has_function_privilege('authenticated', 'public.ensure_power_wallet(uuid)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.consume_power_points(uuid,uuid,text,text,uuid)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.grant_monthly_power(uuid,text)', 'EXECUTE')
    OR NOT has_function_privilege('authenticated', 'public.change_my_power_way(text,text)', 'EXECUTE')
    OR NOT has_function_privilege('authenticated', 'public.get_my_power_status(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Power function grants do not match the V1 boundary';
  END IF;

  IF NOT has_function_privilege('service_role', 'public.ensure_power_wallet(uuid)', 'EXECUTE')
    OR NOT has_function_privilege('service_role', 'public.consume_power_points(uuid,uuid,text,text,uuid)', 'EXECUTE')
    OR NOT has_function_privilege('service_role', 'public.grant_monthly_power(uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role Power function grants are incomplete';
  END IF;

  SELECT pg_get_functiondef('public.consume_power_points(uuid,uuid,text,text,uuid)'::regprocedure)
  INTO consume_definition;
  SELECT pg_get_functiondef('public.ensure_power_wallet(uuid)'::regprocedure)
  INTO ensure_definition;
  SELECT pg_get_functiondef('public.grant_monthly_power(uuid,text)'::regprocedure)
  INTO monthly_definition;
  SELECT pg_get_functiondef('public.change_my_power_way(text,text)'::regprocedure)
  INTO way_change_definition;

  IF position('FOR UPDATE' IN ensure_definition) = 0
    OR position('ensure_power_wallet' IN consume_definition) = 0
    OR position('Insufficient Power Points' IN consume_definition) = 0
    OR position('way_at_operation' IN consume_definition) = 0
    OR position('wallet_id' IN consume_definition) = 0
    OR position('idempotency_key' IN consume_definition) = 0 THEN
    RAISE EXCEPTION 'Power consumption is missing concurrency, depletion, Way or idempotency guards';
  END IF;

  IF position('SELECT monthly_allocation' IN monthly_definition) = 0
    OR position('power_plan_policies' IN monthly_definition) = 0
    OR position('last_monthly_allocation_at' IN monthly_definition) = 0
    OR position('power-v1:monthly:' IN monthly_definition) = 0
    OR position('LEAST(v_cap, v_wallet.balance + v_allocation)' IN monthly_definition) = 0
    OR position('p_amount' IN monthly_definition) <> 0 THEN
    RAISE EXCEPTION 'Monthly Power allocation must derive its amount from policy';
  END IF;

  IF position('interval ''30 days''' IN way_change_definition) = 0
    OR position('last_way_change_at' IN way_change_definition) = 0
    OR position('''way_change''' IN way_change_definition) = 0
    OR position('amount_points' IN way_change_definition) = 0
    OR position('conversion'', ''À DÉFINIR' IN way_change_definition) = 0
    OR position('v_balance' IN way_change_definition) = 0
    OR position('p_way' IN way_change_definition) = 0 THEN
    RAISE EXCEPTION 'Power Way change must enforce cooldown and record a zero-balance transaction';
  END IF;
END;
$$;

SELECT 'Power System V1 contract passed' AS status;
