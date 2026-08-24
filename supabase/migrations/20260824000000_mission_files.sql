-- Workspace de fichiers temps réel pour les missions Idealy.
-- Les écritures de construction passent par l'Edge Function avec service role.
-- Les clients authentifiés peuvent uniquement lire les fichiers de leurs missions.

CREATE TABLE IF NOT EXISTS public.mission_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'writing', 'saved', 'validated', 'error')),
  checksum TEXT,
  source TEXT NOT NULL DEFAULT 'builder' CHECK (source IN ('builder', 'reviewer', 'user', 'system')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mission_id, path, version)
);

CREATE INDEX IF NOT EXISTS mission_files_mission_path_idx
  ON public.mission_files(mission_id, path, version DESC);

CREATE TABLE IF NOT EXISTS public.mission_file_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  sequence BIGINT NOT NULL CHECK (sequence > 0),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'mission_started',
    'agent_started',
    'file_started',
    'file_saved',
    'build_log',
    'validation_result',
    'mission_completed',
    'mission_error'
  )),
  path TEXT,
  file_version INTEGER,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mission_id, sequence)
);

CREATE INDEX IF NOT EXISTS mission_file_events_mission_sequence_idx
  ON public.mission_file_events(mission_id, sequence);

DROP TRIGGER IF EXISTS mission_files_updated_at ON public.mission_files;
CREATE TRIGGER mission_files_updated_at
  BEFORE UPDATE ON public.mission_files
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.mission_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_file_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mission_files_select_own ON public.mission_files;
CREATE POLICY mission_files_select_own
  ON public.mission_files
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.missions
      WHERE public.missions.id = mission_files.mission_id
        AND public.missions.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS mission_file_events_select_own ON public.mission_file_events;
CREATE POLICY mission_file_events_select_own
  ON public.mission_file_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.missions
      WHERE public.missions.id = mission_file_events.mission_id
        AND public.missions.user_id = auth.uid()
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.mission_files FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.mission_file_events FROM anon, authenticated;
GRANT SELECT ON public.mission_files, public.mission_file_events TO authenticated;

CREATE OR REPLACE FUNCTION public.append_mission_file_event(
  p_mission_id UUID,
  p_event_type TEXT,
  p_path TEXT,
  p_file_version INTEGER,
  p_payload JSONB,
  p_idempotency_key TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_sequence BIGINT;
  next_sequence BIGINT;
BEGIN
  IF p_mission_id IS NULL OR p_event_type IS NULL OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'Invalid mission file event identity';
  END IF;

  SELECT sequence
    INTO existing_sequence
    FROM public.mission_file_events
   WHERE mission_id = p_mission_id
     AND payload->>'idempotencyKey' = p_idempotency_key
   LIMIT 1;
  IF existing_sequence IS NOT NULL THEN
    RETURN existing_sequence;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_mission_id::text));
  SELECT COALESCE(MAX(sequence), 0) + 1
    INTO next_sequence
    FROM public.mission_file_events
   WHERE mission_id = p_mission_id;

  INSERT INTO public.mission_file_events(
    mission_id, sequence, event_type, path, file_version, payload
  ) VALUES (
    p_mission_id, next_sequence, p_event_type, p_path, p_file_version,
    COALESCE(p_payload, '{}'::jsonb) || jsonb_build_object('idempotencyKey', p_idempotency_key)
  );

  RETURN next_sequence;
END;
$$;

REVOKE ALL ON FUNCTION public.append_mission_file_event(UUID, TEXT, TEXT, INTEGER, JSONB, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.append_mission_file_event(UUID, TEXT, TEXT, INTEGER, JSONB, TEXT)
  TO service_role;
