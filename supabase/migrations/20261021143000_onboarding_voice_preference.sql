-- Persist the user's selected Idealy voice without changing existing account or billing behavior.
-- The onboarding RPC remains the only write path for this profile data.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_voice TEXT NOT NULL DEFAULT 'nova';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_preferred_voice_check,
  ADD CONSTRAINT profiles_preferred_voice_check
    CHECK (preferred_voice IN ('aurora', 'nova', 'atlas', 'pulse'));

DROP FUNCTION IF EXISTS public.complete_my_onboarding(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.complete_my_onboarding(
  p_first_name TEXT,
  p_last_name TEXT,
  p_primary_goal TEXT,
  p_project_type TEXT,
  p_experience_level TEXT,
  p_discovery_source TEXT,
  p_way TEXT,
  p_preferred_language TEXT DEFAULT 'fr',
  p_timezone TEXT DEFAULT 'UTC',
  p_preferred_voice TEXT DEFAULT 'nova'
)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  way TEXT,
  onboarding_completed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_first_name TEXT := left(trim(COALESCE(p_first_name, '')), 80);
  v_last_name TEXT := NULLIF(left(trim(COALESCE(p_last_name, '')), 80), '');
  v_primary_goal TEXT := left(trim(COALESCE(p_primary_goal, '')), 400);
  v_project_type TEXT := lower(trim(COALESCE(p_project_type, '')));
  v_experience_level TEXT := lower(trim(COALESCE(p_experience_level, '')));
  v_discovery_source TEXT := NULLIF(lower(trim(COALESCE(p_discovery_source, ''))), '');
  v_way TEXT := lower(trim(COALESCE(p_way, '')));
  v_language TEXT := lower(trim(COALESCE(p_preferred_language, 'fr')));
  v_timezone TEXT := trim(COALESCE(p_timezone, 'UTC'));
  v_preferred_voice TEXT := lower(trim(COALESCE(p_preferred_voice, 'nova')));
  v_email TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  IF v_first_name = '' OR v_primary_goal = '' THEN
    RAISE EXCEPTION 'First name and primary goal are required';
  END IF;
  IF v_way NOT IN ('mage', 'ninja', 'hunter', 'professional') THEN
    RAISE EXCEPTION 'Invalid way';
  END IF;
  IF v_preferred_voice NOT IN ('aurora', 'nova', 'atlas', 'pulse') THEN
    RAISE EXCEPTION 'Invalid preferred voice';
  END IF;
  IF v_project_type NOT IN ('web', 'mobile', 'saas', 'startup', 'site', 'prototype', 'internal_tool', 'other') THEN
    RAISE EXCEPTION 'Invalid project type';
  END IF;
  IF v_experience_level NOT IN ('beginner', 'intermediate', 'advanced', 'expert', 'non_coder') THEN
    RAISE EXCEPTION 'Invalid experience level';
  END IF;
  IF v_discovery_source IS NOT NULL
    AND v_discovery_source NOT IN ('tiktok', 'youtube', 'google', 'github', 'friend', 'school', 'community', 'other') THEN
    RAISE EXCEPTION 'Invalid discovery source';
  END IF;
  IF v_language !~ '^[a-z]{2,3}(-[a-z]{2})?$' OR length(v_language) > 7 THEN
    RAISE EXCEPTION 'Invalid preferred language';
  END IF;
  IF v_timezone = '' OR length(v_timezone) > 64 OR v_timezone !~ '^[A-Za-z0-9_+./-]+$' THEN
    RAISE EXCEPTION 'Invalid timezone';
  END IF;

  UPDATE public.profiles
     SET first_name = v_first_name,
         last_name = v_last_name,
         display_name = left(concat_ws(' ', v_first_name, v_last_name), 120),
         primary_goal = v_primary_goal,
         project_type = v_project_type,
         experience_level = v_experience_level,
         discovery_source = v_discovery_source,
         way = v_way,
         preferred_voice = v_preferred_voice,
         preferred_language = v_language,
         timezone = v_timezone,
         onboarding_completed = TRUE,
         onboarding_completed_at = now(),
         updated_at = now()
   WHERE profiles.id = v_user_id
   RETURNING profiles.id, profiles.display_name, profiles.way, profiles.onboarding_completed
        INTO id, display_name, way, onboarding_completed;

  IF NOT FOUND THEN
    SELECT COALESCE(u.email, '') INTO v_email FROM auth.users u WHERE u.id = v_user_id;
    IF v_email IS NULL OR v_email = '' THEN
      v_email := COALESCE(auth.jwt() ->> 'email', 'user@idealy.local');
    END IF;

    INSERT INTO public.profiles (
      id, email, first_name, last_name, display_name, primary_goal,
      project_type, experience_level, discovery_source, way, preferred_voice,
      preferred_language, timezone, onboarding_completed, onboarding_completed_at
    )
    VALUES (
      v_user_id,
      v_email,
      v_first_name,
      v_last_name,
      left(concat_ws(' ', v_first_name, v_last_name), 120),
      v_primary_goal,
      v_project_type,
      v_experience_level,
      v_discovery_source,
      v_way,
      v_preferred_voice,
      v_language,
      v_timezone,
      TRUE,
      now()
    )
    RETURNING profiles.id, profiles.display_name, profiles.way, profiles.onboarding_completed
         INTO id, display_name, way, onboarding_completed;
  END IF;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_my_onboarding(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_my_onboarding(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
