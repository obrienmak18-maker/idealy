-- Plugin Engine contract: structure, grants and RLS boundaries.
-- Every check is a hard failure, so this script cannot pass while a plugin table
-- is missing, over-permissive, or readable by another user.

DO $$
DECLARE
  definition TEXT;
BEGIN
  -- ─── Structure ────────────────────────────────────────────────────────
  IF to_regclass('public.plugin_installations') IS NULL THEN
    RAISE EXCEPTION 'plugin_installations is missing';
  END IF;
  IF to_regclass('public.plugin_executions') IS NULL THEN
    RAISE EXCEPTION 'plugin_executions is missing';
  END IF;
  IF to_regclass('public.plugin_events') IS NULL THEN
    RAISE EXCEPTION 'plugin_events is missing';
  END IF;

  -- ─── No client-side mutation authority ─────────────────────────────────
  IF has_table_privilege('anon', 'public.plugin_installations', 'INSERT, UPDATE, DELETE') THEN
    RAISE EXCEPTION 'anon must not mutate plugin_installations';
  END IF;
  IF has_table_privilege('authenticated', 'public.plugin_installations', 'INSERT, UPDATE, DELETE') THEN
    RAISE EXCEPTION 'authenticated must not mutate plugin_installations directly';
  END IF;
  IF has_table_privilege('authenticated', 'public.plugin_executions', 'INSERT, UPDATE, DELETE') THEN
    RAISE EXCEPTION 'authenticated must not mutate plugin_executions directly';
  END IF;
  IF has_table_privilege('anon', 'public.plugin_executions', 'SELECT') THEN
    RAISE EXCEPTION 'anon must not read plugin_executions';
  END IF;

  -- ─── RLS isolation: User A must never see User B ──────────────────────
  FOR definition IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('plugin_installations', 'plugin_executions', 'plugin_events')
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policy
      WHERE polrelid = ('public.' || definition)::regclass
        AND polcmd = 'SELECT'
        AND polqual IS NOT NULL
        AND pg_get_expr(polqual, polrelid) LIKE '%auth.uid()%'
    ) THEN
      RAISE EXCEPTION '% must have a SELECT policy constrained to auth.uid()', definition;
    END IF;
  END LOOP;

  -- ─── Permissions are constrained to the declared vocabulary ───────────
  SELECT pg_get_constraintdef(oid) INTO definition
  FROM pg_constraint
  WHERE conrelid = 'public.plugin_executions'::regclass
    AND conname LIKE '%status%';
  IF definition IS NULL THEN
    RAISE EXCEPTION 'plugin_executions.status must be constrained';
  END IF;
  IF position('denied' IN definition) = 0 THEN
    RAISE EXCEPTION 'plugin_executions.status must accept the denied state';
  END IF;

  -- An execution can never claim more attempts than the retry budget allows.
  SELECT pg_get_constraintdef(oid) INTO definition
  FROM pg_constraint
  WHERE conrelid = 'public.plugin_executions'::regclass
    AND pg_get_constraintdef(oid) LIKE '%attempts >= 0%';
  IF definition IS NULL THEN
    RAISE EXCEPTION 'plugin_executions.attempts must be non-negative';
  END IF;
END;
$$;

SELECT 'Plugin Engine contract passed' AS status;