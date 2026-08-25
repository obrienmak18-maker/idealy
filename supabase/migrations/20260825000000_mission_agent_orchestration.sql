-- Runs d'agents persistants. Les écritures passent exclusivement par les Edge Functions.
CREATE TABLE IF NOT EXISTS public.mission_agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_key TEXT NOT NULL CHECK (char_length(run_key) BETWEEN 16 AND 180),
  step_index SMALLINT NOT NULL CHECK (step_index BETWEEN 1 AND 8),
  agent_key TEXT NOT NULL CHECK (agent_key IN ('architect', 'builder', 'reviewer')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  input_digest TEXT NOT NULL,
  output_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  credit_debit_key TEXT,
  error_code TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mission_id, run_key, step_index),
  UNIQUE (mission_id, run_key, agent_key)
);

CREATE INDEX IF NOT EXISTS mission_agent_runs_mission_created_idx
  ON public.mission_agent_runs(mission_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mission_agent_runs_user_status_idx
  ON public.mission_agent_runs(user_id, status);

DROP TRIGGER IF EXISTS mission_agent_runs_updated_at ON public.mission_agent_runs;
CREATE TRIGGER mission_agent_runs_updated_at
  BEFORE UPDATE ON public.mission_agent_runs
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.mission_agent_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mission_agent_runs_select_own ON public.mission_agent_runs;
CREATE POLICY mission_agent_runs_select_own
  ON public.mission_agent_runs FOR SELECT TO authenticated
  USING (user_id = auth.uid());
REVOKE ALL ON public.mission_agent_runs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.mission_agent_runs TO authenticated;

-- Toute action externe est préparée et expire. Aucun agent ne peut consommer cette
-- confirmation sans le jeton à usage unique créé après l’accord de l’utilisateur.
CREATE TABLE IF NOT EXISTS public.mission_action_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES public.user_integrations(id) ON DELETE SET NULL,
  operation TEXT NOT NULL CHECK (char_length(operation) BETWEEN 3 AND 120),
  resource_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  confirmation_token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'consumed', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  approved_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS mission_action_confirmations_mission_status_idx
  ON public.mission_action_confirmations(mission_id, status, expires_at);

ALTER TABLE public.mission_action_confirmations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mission_action_confirmations_select_own ON public.mission_action_confirmations;
CREATE POLICY mission_action_confirmations_select_own
  ON public.mission_action_confirmations FOR SELECT TO authenticated
  USING (user_id = auth.uid());
REVOKE ALL ON public.mission_action_confirmations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.mission_action_confirmations TO authenticated;

-- Ajoute les jalons nécessaires au journal d'exécution, sans enlever les événements existants.
ALTER TABLE public.mission_file_events
  DROP CONSTRAINT IF EXISTS mission_file_events_event_type_check;
ALTER TABLE public.mission_file_events
  ADD CONSTRAINT mission_file_events_event_type_check CHECK (event_type IN (
    'mission_started', 'agent_started', 'agent_completed', 'agent_failed',
    'file_started', 'file_saved', 'validation_result', 'mission_completed', 'mission_error'
  ));
