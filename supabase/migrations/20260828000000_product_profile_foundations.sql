-- Product foundations: richer onboarding profile and a user-owned active Way.
-- This migration is additive. It does not alter plan, Stripe, credits or any
-- server-managed entitlement and therefore preserves the existing billing model.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS experience_level TEXT,
  ADD COLUMN IF NOT EXISTS primary_goal TEXT,
  ADD COLUMN IF NOT EXISTS project_type TEXT,
  ADD COLUMN IF NOT EXISTS discovery_source TEXT,
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'fr',
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Normalize only the legacy vocabulary that can be mapped unambiguously. A
-- missing value remains missing so a user can choose deliberately in onboarding.
UPDATE public.profiles
SET way = CASE lower(trim(way))
  WHEN 'mage' THEN 'mage'
  WHEN 'mana' THEN 'mage'
  WHEN 'ninja' THEN 'ninja'
  WHEN 'chakra' THEN 'ninja'
  WHEN 'hunter' THEN 'hunter'
  WHEN 'nen' THEN 'hunter'
  WHEN 'professional' THEN 'professional'
  WHEN 'pro' THEN 'professional'
  WHEN 'energy' THEN 'professional'
  ELSE NULL
END
WHERE way IS NOT NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_way_check,
  ADD CONSTRAINT profiles_way_check
    CHECK (way IS NULL OR way IN ('mage', 'ninja', 'hunter', 'professional')),
  DROP CONSTRAINT IF EXISTS profiles_experience_level_check,
  ADD CONSTRAINT profiles_experience_level_check
    CHECK (
      experience_level IS NULL
      OR experience_level IN ('beginner', 'intermediate', 'advanced', 'expert', 'non_coder')
    ),
  DROP CONSTRAINT IF EXISTS profiles_project_type_check,
  ADD CONSTRAINT profiles_project_type_check
    CHECK (
      project_type IS NULL
      OR project_type IN ('web', 'mobile', 'saas', 'startup', 'site', 'prototype', 'internal_tool', 'other')
    ),
  DROP CONSTRAINT IF EXISTS profiles_discovery_source_check,
  ADD CONSTRAINT profiles_discovery_source_check
    CHECK (
      discovery_source IS NULL
      OR discovery_source IN ('tiktok', 'youtube', 'google', 'github', 'friend', 'school', 'community', 'other')
    );

-- Profiles now contain onboarding data and must not be a public directory.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
CREATE POLICY "Users can view their own profile."
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Direct REST updates could otherwise alter any column in the profile row,
-- including plan, Stripe customer identifiers and server-managed balances.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.profiles FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.complete_my_onboarding(
  p_first_name TEXT,
  p_last_name TEXT,
  p_primary_goal TEXT,
  p_project_type TEXT,
  p_experience_level TEXT,
  p_discovery_source TEXT,
  p_way TEXT,
  p_preferred_language TEXT DEFAULT 'fr',
  p_timezone TEXT DEFAULT 'UTC'
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
         preferred_language = v_language,
         timezone = v_timezone,
         onboarding_completed = TRUE,
         onboarding_completed_at = now(),
         updated_at = now()
   WHERE profiles.id = v_user_id
   RETURNING profiles.id, profiles.display_name, profiles.way, profiles.onboarding_completed
        INTO id, display_name, way, onboarding_completed;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile provisioning is incomplete';
  END IF;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_my_onboarding(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_my_onboarding(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO authenticated;
