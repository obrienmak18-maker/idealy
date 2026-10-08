-- Persist ephemeral PKCE/nonce parameters for OAuth callbacks.
-- Never store provider access or refresh tokens in this table.

ALTER TABLE public.integration_oauth_states
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.integration_oauth_states.metadata IS
  'Ephemeral OAuth flow parameters such as PKCE verifier and nonce; never contains provider access tokens.';
