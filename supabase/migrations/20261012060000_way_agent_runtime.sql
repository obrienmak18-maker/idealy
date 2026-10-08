-- Canonical Way-specific five-agent runtime.
-- Keep architect for historical runs; new missions may persist chief/designer/specialist
-- alongside builder and reviewer.

ALTER TABLE public.mission_agent_runs
  DROP CONSTRAINT IF EXISTS mission_agent_runs_agent_key_check;

ALTER TABLE public.mission_agent_runs
  ADD CONSTRAINT mission_agent_runs_agent_key_check
  CHECK (agent_key IN (
    'architect','chief','builder','designer','specialist','reviewer'
  ));

ALTER TABLE public.mission_agent_runs
  ADD COLUMN IF NOT EXISTS agent_name TEXT,
  ADD COLUMN IF NOT EXISTS agent_role TEXT;

COMMENT ON COLUMN public.mission_agent_runs.agent_name IS
  'Canonical Way-specific agent display name used for this mission run.';

COMMENT ON COLUMN public.mission_agent_runs.agent_role IS
  'Execution responsibility of the canonical Way-specific agent.';
