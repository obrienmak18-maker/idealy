BEGIN;

DO $$
DECLARE
  has_runs BOOLEAN;
  has_confirmations BOOLEAN;
  anon_can_insert BOOLEAN;
  authenticated_can_update BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'mission_agent_runs'
  ) INTO has_runs;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'mission_action_confirmations'
  ) INTO has_confirmations;
  IF NOT has_runs OR NOT has_confirmations THEN
    RAISE EXCEPTION 'Mission orchestration tables are missing';
  END IF;

  SELECT has_table_privilege('anon', 'public.mission_agent_runs', 'INSERT')
    INTO anon_can_insert;
  SELECT has_table_privilege('authenticated', 'public.mission_action_confirmations', 'UPDATE')
    INTO authenticated_can_update;
  IF anon_can_insert OR authenticated_can_update THEN
    RAISE EXCEPTION 'Browser roles must not mutate orchestration tables';
  END IF;
END $$;

ROLLBACK;
