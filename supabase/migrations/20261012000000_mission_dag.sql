-- Mission DAG persistence.
--
-- Additive only: `missions` is extended with the DAG status vocabulary and two
-- new tables hold the task graph and its event journal. Writes belong to the
-- service role (Edge Functions); clients only ever read their own rows.

-- ─── Mission status vocabulary ─────────────────────────────────────────────
-- The DAG adds planned/running/waiting/verifying/completed/failed/cancelled/
-- blocked while keeping the pre-existing values so no live mission is orphaned.
ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS execution_id TEXT,
  ADD COLUMN IF NOT EXISTS max_concurrent_tasks SMALLINT NOT NULL DEFAULT 3;

ALTER TABLE public.missions
  DROP CONSTRAINT IF EXISTS missions_max_concurrent_tasks_check;
ALTER TABLE public.missions
  ADD CONSTRAINT missions_max_concurrent_tasks_check
  CHECK (max_concurrent_tasks BETWEEN 1 AND 16);

ALTER TABLE public.missions
  DROP CONSTRAINT IF EXISTS missions_status_check;
ALTER TABLE public.missions
  ADD CONSTRAINT missions_status_check CHECK (status IN (
    'draft', 'planned', 'running', 'waiting', 'verifying', 'completed',
    'failed', 'cancelled', 'blocked',
    'building', 'ready', 'needs-fix', 'published'
  ));

-- ─── Task graph ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mission_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_key TEXT NOT NULL CHECK (char_length(task_key) BETWEEN 1 AND 64),
  task_type TEXT NOT NULL CHECK (char_length(task_type) BETWEEN 3 AND 32),
  agent_id TEXT NOT NULL CHECK (char_length(agent_id) BETWEEN 2 AND 32),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'blocked', 'ready', 'running', 'success',
    'failed', 'retrying', 'cancelled', 'skipped'
  )),
  dependencies TEXT[] NOT NULL DEFAULT '{}',
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  outputs JSONB,
  result JSONB,
  attempts SMALLINT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts SMALLINT NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 10),
  priority SMALLINT NOT NULL DEFAULT 0,
  attempt_key TEXT,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mission_id, task_key)
);

CREATE INDEX IF NOT EXISTS mission_tasks_mission_status_idx
  ON public.mission_tasks(mission_id, status);
CREATE INDEX IF NOT EXISTS mission_tasks_user_idx
  ON public.mission_tasks(user_id);

DROP TRIGGER IF EXISTS mission_tasks_updated_at ON public.mission_tasks;
CREATE TRIGGER mission_tasks_updated_at
  BEFORE UPDATE ON public.mission_tasks
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.mission_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mission_tasks_select_own ON public.mission_tasks;
CREATE POLICY mission_tasks_select_own
  ON public.mission_tasks FOR SELECT TO authenticated
  USING (user_id = auth.uid());
REVOKE ALL ON public.mission_tasks FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.mission_tasks TO authenticated;

-- ─── Orchestration event journal ───────────────────────────────────────────
-- Append-only. The timeline is rebuilt from these rows, so a refresh never
-- loses the mission story and the frontend never invents an event.
CREATE TABLE IF NOT EXISTS public.mission_orchestration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.mission_tasks(id) ON DELETE SET NULL,
  sequence BIGINT NOT NULL CHECK (sequence > 0),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'mission_created', 'mission_started', 'mission_paused', 'mission_resumed',
    'mission_cancelled', 'mission_completed', 'mission_failed',
    'task_created', 'task_ready', 'task_started', 'task_progress',
    'task_succeeded', 'task_failed', 'task_retrying', 'task_blocked',
    'task_skipped', 'task_cancelled',
    'agent_started', 'agent_completed', 'tool_started', 'tool_completed',
    'power_reserved', 'power_settled'
  )),
  task_key TEXT,
  attempt SMALLINT,
  status TEXT,
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 400),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key TEXT UNIQUE
    CHECK (idempotency_key IS NULL OR char_length(idempotency_key) BETWEEN 8 AND 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mission_id, sequence)
);

CREATE INDEX IF NOT EXISTS mission_orchestration_events_mission_seq_idx
  ON public.mission_orchestration_events(mission_id, sequence);
CREATE INDEX IF NOT EXISTS mission_orchestration_events_user_idx
  ON public.mission_orchestration_events(user_id, created_at DESC);

ALTER TABLE public.mission_orchestration_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mission_orchestration_events_select_own
  ON public.mission_orchestration_events;
CREATE POLICY mission_orchestration_events_select_own
  ON public.mission_orchestration_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());
REVOKE ALL ON public.mission_orchestration_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.mission_orchestration_events TO authenticated;

-- ─── Append helper ─────────────────────────────────────────────────────────
-- Sequence is allocated server-side and a repeated idempotency key becomes a
-- no-op, so a retried Edge Function can never duplicate a timeline entry.
CREATE OR REPLACE FUNCTION public.append_orchestration_event(
  p_mission_id UUID,
  p_user_id UUID,
  p_event_type TEXT,
  p_message TEXT,
  p_task_key TEXT DEFAULT NULL,
  p_attempt SMALLINT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS TABLE(event_id UUID, sequence BIGINT, already_appended BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_sequence BIGINT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.missions WHERE id = p_mission_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Mission does not belong to user';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT e.id, e.sequence INTO v_event_id, v_sequence
    FROM public.mission_orchestration_events AS e
    WHERE e.idempotency_key = p_idempotency_key AND e.user_id = p_user_id;
    IF v_event_id IS NOT NULL THEN
      RETURN QUERY SELECT v_event_id, v_sequence, TRUE;
      RETURN;
    END IF;
  END IF;

  SELECT COALESCE(MAX(e.sequence), 0) + 1 INTO v_sequence
  FROM public.mission_orchestration_events AS e
  WHERE e.mission_id = p_mission_id;

  INSERT INTO public.mission_orchestration_events (
    mission_id, user_id, task_key, sequence, event_type,
    attempt, status, message, payload, idempotency_key
  ) VALUES (
    p_mission_id, p_user_id, p_task_key, v_sequence, p_event_type,
    p_attempt, p_status, left(p_message, 400), p_payload, p_idempotency_key
  ) RETURNING id INTO v_event_id;

  RETURN QUERY SELECT v_event_id, v_sequence, FALSE;
EXCEPTION
  WHEN unique_violation THEN
    SELECT e.id, e.sequence INTO v_event_id, v_sequence
    FROM public.mission_orchestration_events AS e
    WHERE e.idempotency_key = p_idempotency_key AND e.user_id = p_user_id;
    RETURN QUERY SELECT v_event_id, v_sequence, TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.append_orchestration_event(
  UUID, UUID, TEXT, TEXT, TEXT, SMALLINT, TEXT, JSONB, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.append_orchestration_event(
  UUID, UUID, TEXT, TEXT, TEXT, SMALLINT, TEXT, JSONB, TEXT
) TO service_role;