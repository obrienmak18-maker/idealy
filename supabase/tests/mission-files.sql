DO $$
BEGIN
  IF to_regclass('public.mission_files') IS NULL THEN
    RAISE EXCEPTION 'mission_files table is missing';
  END IF;

  IF to_regclass('public.mission_file_events') IS NULL THEN
    RAISE EXCEPTION 'mission_file_events table is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.mission_files'::regclass
      AND attname = 'content'
      AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'mission_files.content column is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.mission_file_events'::regclass
      AND attname = 'sequence'
      AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'mission_file_events.sequence column is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class
    WHERE oid = 'public.mission_files'::regclass
      AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'mission_files RLS is not enabled';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class
    WHERE oid = 'public.mission_file_events'::regclass
      AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'mission_file_events RLS is not enabled';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mission_files'
      AND policyname = 'mission_files_select_own'
  ) THEN
    RAISE EXCEPTION 'mission_files owner policy is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mission_file_events'
      AND policyname = 'mission_file_events_select_own'
  ) THEN
    RAISE EXCEPTION 'mission_file_events owner policy is missing';
  END IF;

  IF to_regprocedure('public.append_mission_file_event(uuid,text,text,integer,jsonb,text)') IS NULL THEN
    RAISE EXCEPTION 'append_mission_file_event function is missing';
  END IF;
END;
$$;

SELECT 'mission-files migration contract passed' AS status;
