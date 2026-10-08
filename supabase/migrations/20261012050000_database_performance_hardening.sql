-- Production hardening: index foreign keys in the canonical Supabase schema and optimize RLS evaluation.
-- The changes are additive or remove only redundant legacy policies.

CREATE INDEX IF NOT EXISTS credit_ledger_mission_id_idx
  ON public.credit_ledger (mission_id);
CREATE INDEX IF NOT EXISTS mission_action_confirmations_integration_id_idx
  ON public.mission_action_confirmations (integration_id);
CREATE INDEX IF NOT EXISTS mission_action_confirmations_user_id_idx
  ON public.mission_action_confirmations (user_id);
CREATE INDEX IF NOT EXISTS mission_orchestration_events_task_id_idx
  ON public.mission_orchestration_events (task_id);
CREATE INDEX IF NOT EXISTS oauth_states_user_id_idx
  ON public.oauth_states (user_id);
CREATE INDEX IF NOT EXISTS plugin_events_execution_id_idx
  ON public.plugin_events (execution_id);
CREATE INDEX IF NOT EXISTS plugin_executions_plugin_installation_id_idx
  ON public.plugin_executions (plugin_installation_id);

DO $$
DECLARE
  p record;
  ddl text;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (coalesce(qual, '') LIKE '%auth.uid()%' OR coalesce(with_check, '') LIKE '%auth.uid()%')
  LOOP
    ddl := format(
      'ALTER POLICY %I ON %I.%I',
      p.policyname,
      p.schemaname,
      p.tablename
    );

    IF p.qual IS NOT NULL THEN
      ddl := ddl || format(
        ' USING (%s)',
        replace(p.qual, 'auth.uid()', '(select auth.uid())')
      );
    END IF;

    IF p.with_check IS NOT NULL THEN
      ddl := ddl || format(
        ' WITH CHECK (%s)',
        replace(p.with_check, 'auth.uid()', '(select auth.uid())')
      );
    END IF;

    EXECUTE ddl;
  END LOOP;
END
$$;

-- Remove redundant legacy public-role policies superseded by authenticated-only
-- owner policies. This does not change authenticated access semantics.
DROP POLICY IF EXISTS "Users can delete own missions." ON public.missions;
DROP POLICY IF EXISTS "Users can insert own missions." ON public.missions;
DROP POLICY IF EXISTS "Users can view own missions." ON public.missions;
DROP POLICY IF EXISTS "Users can update own missions." ON public.missions;
DROP POLICY IF EXISTS user_integrations_select_own ON public.user_integrations;
