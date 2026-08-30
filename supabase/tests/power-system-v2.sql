DO $$
DECLARE
  status_definition TEXT;
BEGIN
  IF to_regprocedure('public.get_my_power_status(text)') IS NULL THEN
    RAISE EXCEPTION 'Power V2 status function is missing';
  END IF;

  IF has_function_privilege('anon', 'public.get_my_power_status(text)', 'EXECUTE')
    OR NOT has_function_privilege('authenticated', 'public.get_my_power_status(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Power V2 status function grants are unsafe';
  END IF;

  SELECT pg_get_functiondef('public.get_my_power_status(text)'::regprocedure)
    INTO status_definition;
  IF position('auth.uid()' IN status_definition) = 0
    OR position('SECURITY DEFINER' IN status_definition) = 0
    OR position('SET search_path = public' IN status_definition) = 0
    OR position('can_execute' IN status_definition) = 0
    OR position('resource_label' IN status_definition) = 0 THEN
    RAISE EXCEPTION 'Power V2 status function is missing authenticated contextual safeguards';
  END IF;
END;
$$;

SELECT 'Power System V2 contract passed' AS status;
