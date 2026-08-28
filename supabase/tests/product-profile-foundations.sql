DO $$
DECLARE
  onboarding_definition TEXT;
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'profiles table is missing';
  END IF;

  FOREACH onboarding_definition IN ARRAY ARRAY[
    'first_name',
    'last_name',
    'way',
    'experience_level',
    'primary_goal',
    'project_type',
    'discovery_source',
    'preferred_language',
    'timezone',
    'onboarding_completed'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_attribute
      WHERE attrelid = 'public.profiles'::regclass
        AND attname = onboarding_definition
        AND NOT attisdropped
    ) THEN
      RAISE EXCEPTION 'profiles.% is missing', onboarding_definition;
    END IF;
  END LOOP;

  IF has_table_privilege('authenticated', 'public.profiles', 'INSERT, UPDATE, DELETE') THEN
    RAISE EXCEPTION 'authenticated must not directly mutate profiles';
  END IF;

  IF NOT has_function_privilege(
    'authenticated',
    'public.complete_my_onboarding(text,text,text,text,text,text,text,text,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'authenticated must be able to complete its own onboarding';
  END IF;

  IF has_function_privilege(
    'anon',
    'public.complete_my_onboarding(text,text,text,text,text,text,text,text,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'anon must not complete onboarding';
  END IF;

  SELECT pg_get_functiondef(
    'public.complete_my_onboarding(text,text,text,text,text,text,text,text,text)'::regprocedure
  )
  INTO onboarding_definition;
  IF position('v_user_id UUID := auth.uid()' IN onboarding_definition) = 0
    OR position('Invalid way' IN onboarding_definition) = 0
    OR position('onboarding_completed = TRUE' IN onboarding_definition) = 0 THEN
    RAISE EXCEPTION 'complete_my_onboarding is missing identity, way or completion guards';
  END IF;
END;
$$;

SELECT 'product profile foundations contract passed' AS status;
