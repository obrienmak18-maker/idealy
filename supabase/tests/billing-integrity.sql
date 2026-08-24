DO $$
DECLARE
  refund_definition TEXT;
BEGIN
  IF to_regclass('public.user_credits') IS NULL THEN
    RAISE EXCEPTION 'user_credits table is missing';
  END IF;

  IF to_regclass('public.credit_ledger') IS NULL THEN
    RAISE EXCEPTION 'credit_ledger table is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.credit_ledger'::regclass
      AND attname = 'reference_idempotency_key'
      AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'credit_ledger.reference_idempotency_key is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid = 'public.user_credits'::regclass AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'user_credits RLS is not enabled';
  END IF;

  IF has_table_privilege('authenticated', 'public.user_credits', 'SELECT, INSERT, UPDATE, DELETE')
    OR has_table_privilege('authenticated', 'public.credit_ledger', 'SELECT, INSERT, UPDATE, DELETE') THEN
    RAISE EXCEPTION 'authenticated must not mutate billing tables directly';
  END IF;

  IF to_regprocedure('public.acquire_ai_request_slot(uuid,integer)') IS NULL THEN
    RAISE EXCEPTION 'acquire_ai_request_slot function is missing';
  END IF;

  IF has_function_privilege('authenticated', 'public.acquire_ai_request_slot(uuid,integer)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.consume_ai_credit(uuid,uuid,text,integer,text)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.grant_user_credits(uuid,text,integer,text)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.refund_ai_credit(uuid,uuid,text,text,integer,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated must not execute billing mutation functions';
  END IF;

  IF NOT has_function_privilege('service_role', 'public.acquire_ai_request_slot(uuid,integer)', 'EXECUTE')
    OR NOT has_function_privilege('service_role', 'public.consume_ai_credit(uuid,uuid,text,integer,text)', 'EXECUTE')
    OR NOT has_function_privilege('service_role', 'public.grant_user_credits(uuid,text,integer,text)', 'EXECUTE')
    OR NOT has_function_privilege('service_role', 'public.refund_ai_credit(uuid,uuid,text,text,integer,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role billing grants are incomplete';
  END IF;

  SELECT pg_get_functiondef('public.refund_ai_credit(uuid,uuid,text,text,integer,text)'::regprocedure)
    INTO refund_definition;
  IF position('reference_idempotency_key' IN refund_definition) = 0
    OR position('Cumulative refunds exceed the original AI debit' IN refund_definition) = 0
    OR position('Refund mission does not match the original AI debit' IN refund_definition) = 0 THEN
    RAISE EXCEPTION 'refund_ai_credit does not enforce original debit linkage';
  END IF;
END;
$$;

SELECT 'billing integrity contract passed' AS status;
