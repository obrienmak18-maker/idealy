-- Schéma versionné des intégrations par utilisateur. Les installations historiques
-- possèdent déjà ces tables : toutes les définitions sont donc additives et idempotentes.
CREATE TABLE IF NOT EXISTS public.user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  connection_type TEXT NOT NULL CHECK (connection_type IN ('oauth', 'api_key', 'service_account', 'mcp')),
  external_account_id TEXT,
  display_name TEXT,
  credential_reference TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error')),
  last_verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS user_integrations_user_status_idx
  ON public.user_integrations(user_id, status);

CREATE TABLE IF NOT EXISTS public.integration_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL UNIQUE REFERENCES public.user_integrations(id) ON DELETE CASCADE,
  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'AES-GCM-256',
  key_version SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.integration_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  state_hash TEXT NOT NULL UNIQUE,
  redirect_uri TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS integration_oauth_states_active_idx
  ON public.integration_oauth_states(provider, expires_at)
  WHERE consumed_at IS NULL;

ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_oauth_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_integrations_select_own ON public.user_integrations;
CREATE POLICY user_integrations_select_own
  ON public.user_integrations FOR SELECT TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON public.user_integrations, public.integration_credentials, public.integration_oauth_states FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_integrations TO authenticated;
