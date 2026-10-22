-- Allow a signed-in user to update only their own workspace preferences.
-- The RPC deliberately cannot alter names, goals, onboarding answers, plan, billing,
-- credits, or any other profile field.
CREATE OR REPLACE FUNCTION public.update_my_settings(
  p_way TEXT DEFAULT NULL,
  p_preferred_language TEXT DEFAULT NULL,
  p_timezone TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  way TEXT,
  preferred_language TEXT,
  timezone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_way TEXT := CASE WHEN p_way IS NULL THEN NULL ELSE lower(trim(p_way)) END;
  v_language TEXT := CASE WHEN p_preferred_language IS NULL THEN NULL ELSE lower(trim(p_preferred_language)) END;
  v_timezone TEXT := CASE WHEN p_timezone IS NULL THEN NULL ELSE trim(p_timezone) END;
  v_profile_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  IF v_way IS NULL AND v_language IS NULL AND v_timezone IS NULL THEN
    RAISE EXCEPTION 'At least one preference must be provided';
  END IF;

  IF v_way IS NOT NULL AND v_way NOT IN ('mage', 'ninja', 'hunter', 'professional') THEN
    RAISE EXCEPTION 'Invalid way';
  END IF;

  IF v_language IS NOT NULL AND v_language NOT IN ('fr', 'en', 'es') THEN
    RAISE EXCEPTION 'Invalid preferred language';
  END IF;

  IF v_timezone IS NOT NULL AND (
    v_timezone = '' OR length(v_timezone) > 64 OR
    v_timezone !~ '^[A-Za-z0-9_+./-]+$'
  ) THEN
    RAISE EXCEPTION 'Invalid timezone';
  END IF;

  UPDATE public.profiles AS profile
     SET way = COALESCE(v_way, profile.way),
         preferred_language = COALESCE(v_language, profile.preferred_language),
         timezone = COALESCE(v_timezone, profile.timezone),
         updated_at = now()
   WHERE profile.id = v_user_id
     AND profile.onboarding_completed = TRUE
   RETURNING profile.id INTO v_profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Completed profile not found';
  END IF;

  RETURN QUERY
    SELECT profile.id, profile.way, profile.preferred_language, profile.timezone
      FROM public.profiles AS profile
     WHERE profile.id = v_profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_my_settings(TEXT, TEXT, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_settings(TEXT, TEXT, TEXT)
  TO authenticated;
