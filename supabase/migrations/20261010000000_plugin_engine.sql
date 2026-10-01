-- Plugin Engine persistence.
--
-- Additive only: no existing table is modified, so an existing deployment keeps
-- working. Every table is scoped to a user and protected by RLS; secrets never
-- live here (tokens stay in public.integration_credentials, already encrypted).

CREATE TABLE IF NOT EXISTS public.plugin_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID,
  plugin_id TEXT NOT NULL CHECK (char_length(plugin_id) BETWEEN 2 AND 63),
  plugin_version TEXT NOT NULL CHECK (plugin_version ~ '^\d+\.\d+\.\d+$'),
  state TEXT NOT NULL DEFAULT 'installed' CHECK (state IN (
    'discovered', 'installed', 'configured', 'authorized',
    'available', 'executing', 'disabled', 'error'
  )),
  -- Only the intersection of what the user approved and the manifest requested.
  granted_permissions TEXT[] NOT NULL DEFAULT '{}',
  connector_provider TEXT,
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  installed_at TIMESTAMPTZ,
  configured_at TIMESTAMPTZ,
  authorized_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, plugin_id)
);

CREATE INDEX IF NOT EXISTS plugin_installations_user_state_idx
  ON public.plugin_installations(user_id, state);

DROP TRIGGER IF EXISTS plugin_installations_updated_at ON public.plugin_installations;
CREATE TRIGGER plugin_installations_updated_at
  BEFORE UPDATE ON public.plugin_installations
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.plugin_installations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plugin_installations_select_own ON public.plugin_installations;
CREATE POLICY plugin_installations_select_own
  ON public.plugin_installations FOR SELECT TO authenticated
  USING (user_id = auth.uid());
REVOKE ALL ON public.plugin_installations FROM PUBLIC, anon;
GRANT SELECT ON public.plugin_installations TO authenticated;

-- An execution is an audit record: it is written by the service role only and is
-- append-only from the client's point of view.
CREATE TABLE IF NOT EXISTS public.plugin_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID,
  plugin_installation_id UUID REFERENCES public.plugin_installations(id) ON DELETE SET NULL,
  plugin_id TEXT NOT NULL CHECK (char_length(plugin_id) BETWEEN 2 AND 63),
  plugin_version TEXT NOT NULL,
  tool_id TEXT NOT NULL CHECK (char_length(tool_id) BETWEEN 2 AND 63),
  mission_id UUID REFERENCES public.missions(id) ON DELETE SET NULL,
  task_id UUID,
  idempotency_key TEXT UNIQUE CHECK (char_length(idempotency_key) BETWEEN 8 AND 200),
  input JSONB,
  output JSONB,
  error TEXT,
  error_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'running', 'succeeded', 'failed', 'denied', 'cancelled'
  )),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plugin_executions_user_created_idx
  ON public.plugin_executions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS plugin_executions_mission_idx
  ON public.plugin_executions(mission_id, created_at DESC)
  WHERE mission_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS plugin_executions_status_idx
  ON public.plugin_executions(status, created_at DESC);

ALTER TABLE public.plugin_executions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plugin_executions_select_own ON public.plugin_executions;
CREATE POLICY plugin_executions_select_own
  ON public.plugin_executions FOR SELECT TO authenticated
  USING (user_id = auth.uid());
REVOKE ALL ON public.plugin_executions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.plugin_executions TO authenticated;

-- Lifecycle transitions are an append-only journal, so an install/configure/
-- authorize/disable history survives for audit instead of being overwritten.
CREATE TABLE IF NOT EXISTS public.plugin_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plugin_id TEXT NOT NULL,
  execution_id UUID REFERENCES public.plugin_executions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'plugin_discovered', 'plugin_installed', 'plugin_configured',
    'plugin_authorized', 'plugin_available', 'plugin_disabled',
    'plugin_error', 'execution_started', 'execution_succeeded',
    'execution_failed', 'execution_denied', 'execution_cancelled'
  )),
  from_state TEXT,
  to_state TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plugin_events_plugin_created_idx
  ON public.plugin_events(user_id, plugin_id, created_at DESC);

ALTER TABLE public.plugin_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plugin_events_select_own ON public.plugin_events;
CREATE POLICY plugin_events_select_own
  ON public.plugin_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());
REVOKE ALL ON public.plugin_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.plugin_events TO authenticated;