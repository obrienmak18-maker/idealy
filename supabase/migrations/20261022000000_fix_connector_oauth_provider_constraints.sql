-- Bring production connector constraints in line with the OAuth providers implemented
-- by integration-connect/integration-callback. Keep OAuth state service-role only.
ALTER TABLE public.integration_oauth_states
  DROP CONSTRAINT IF EXISTS integration_oauth_states_provider_check;
ALTER TABLE public.integration_oauth_states
  ADD CONSTRAINT integration_oauth_states_provider_check
  CHECK (provider = ANY (ARRAY['github','canva','figma','google','notion','slack','vercel']::text[]));

ALTER TABLE public.user_integrations
  DROP CONSTRAINT IF EXISTS user_integrations_provider_check;
ALTER TABLE public.user_integrations
  ADD CONSTRAINT user_integrations_provider_check
  CHECK (provider = ANY (ARRAY['github','canva','supabase','stripe','neon','figma','vercel','notion','slack','google','aws','cloudflare']::text[]));

-- integration-status uses the authenticated user's JWT and owner-scoped RLS.
GRANT SELECT ON TABLE public.user_integrations TO authenticated;
