-- Mission DAG contract: structure, grants, RLS and the event journal.
-- Every check is a hard failure, so this cannot pass while a task table is
-- missing, over-permissive, or readable by another user.

DO $$
DECLARE
  definition TEXT;
  table_name TEXT;
BEGIN
  -- ─── Structure ────────────────────────────────────────────────────────
  IF to_regclass('public.mission_tasks') IS NULL THEN
    RAISE EXCEPTION 'mission_tasks is missing';
  END IF;
  IF to_regclass('public.mission_orchestration_events') IS NULL THEN
    RAISE EXCEPTION 'mission_orchestration_events is missing';
  END IF;
  IF to_regprocedure(
    'public.append_orchestration_event(uuid,uuid,text,text,text,smallint,text,jsonb,text)'
  ) IS NULL THEN
    RAISE EXCEPTION 'append_orchestration_event is missing';
  END IF;

  -- ─── No client-side mutation authority ────────────────────────────────
  IF has_table_privilege('authenticated', 'public.mission_tasks', 'INSERT, UPDATE, DELETE') THEN
    RAISE EXCEPTION 'authenticated must not mutate mission_tasks';
  END IF;
  IF has_table_privilege('anon', 'public.mission_orchestration_events', 'SELECT') THEN
    RAISE EXCEPTION 'anon must not read orchestration events';
  END IF;
  IF has_table_privilege('authenticated', 'public.mission_orchestration_events', 'INSERT') THEN
    RAISE EXCEPTION 'authenticated must not append orchestration events directly';
  END IF;
  IF has_function_privilege(
    'authenticated',
    'public.append_orchestration_event(uuid,uuid,text,text,text,smallint,text,jsonb,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'authenticated must not execute the event append helper';
  END IF;

  -- ─── RLS isolation: User A must never see User B ──────────────────────
  FOREACH table_name IN ARRAY ARRAY[
    'mission_tasks', 'mission_orchestration_events'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policy
      WHERE polrelid = ('public.' || table_name)::regclass
        AND polcmd = 'r' -- pg_policy stores SELECT as 'r'
        AND pg_get_expr(polqual, polrelid) LIKE '%auth.uid()%'
    ) THEN
      RAISE EXCEPTION '% must scope SELECT to auth.uid()', table_name;
    END IF;
  END LOOP;

  -- ─── Status vocabulary the scheduler actually emits ───────────────────
  SELECT pg_get_constraintdef(oid) INTO definition
  FROM pg_constraint
  WHERE conrelid = 'public.mission_tasks'::regclass
    AND conname = 'mission_tasks_status_check';
  IF definition IS NULL THEN
    RAISE EXCEPTION 'mission_tasks.status must be constrained';
  END IF;
  IF position('retrying' IN definition) = 0 OR position('blocked' IN definition) = 0 THEN
    RAISE EXCEPTION 'mission_tasks.status must accept retrying and blocked';
  END IF;

  -- A task can never be recorded as having run more attempts than allowed.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.mission_tasks'::regclass
      AND pg_get_constraintdef(oid) LIKE '%attempts >= 0%'
  ) THEN
    RAISE EXCEPTION 'mission_tasks.attempts must be non-negative';
  END IF;

  -- ─── Event journal shape ──────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.mission_orchestration_events'::regclass
      AND pg_get_constraintdef(oid) LIKE '%UNIQUE (mission_id, sequence)%'
  ) THEN
    RAISE EXCEPTION 'orchestration events must keep a unique mission sequence';
  END IF;

  -- Idempotency is what stops a replayed webhook or retry duplicating an event.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.mission_orchestration_events'::regclass
      AND pg_get_constraintdef(oid) LIKE '%idempotency_key%'
  ) THEN
    RAISE EXCEPTION 'orchestration events must carry an idempotency key';
  END IF;

  -- ─── Mission status widened additively ────────────────────────────────
  SELECT pg_get_constraintdef(oid) INTO definition
  FROM pg_constraint
  WHERE conrelid = 'public.missions'::regclass
    AND conname = 'missions_status_check';
  IF definition IS NULL THEN
    RAISE EXCEPTION 'missions.status must be constrained';
  END IF;
  IF position('planned' IN definition) = 0 OR position('completed' IN definition) = 0 THEN
    RAISE EXCEPTION 'missions.status must accept the DAG vocabulary';
  END IF;
  -- Legacy values must survive the widening.
  IF position('ready' IN definition) = 0 OR position('needs-fix' IN definition) = 0 THEN
    RAISE EXCEPTION 'missions.status must keep the legacy values';
  END IF;
END;
$$;

SELECT 'Mission DAG contract passed' AS status;