-- Mission contracts and reliability metadata.
-- Additive migration: existing mission rows remain valid.

ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS brief jsonb,
  ADD COLUMN IF NOT EXISTS contracts jsonb,
  ADD COLUMN IF NOT EXISTS dna jsonb,
  ADD COLUMN IF NOT EXISTS snapshots jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS validation jsonb,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';

COMMENT ON COLUMN public.missions.brief IS 'User-facing mission brief and clarification answers.';
COMMENT ON COLUMN public.missions.contracts IS 'Versioned design, data, action, test and deployment contracts.';
COMMENT ON COLUMN public.missions.dna IS 'Versioned Idealy Mission DNA: intention, decisions, agents and publication context.';
COMMENT ON COLUMN public.missions.snapshots IS 'Bounded list of restorable project snapshots.';
COMMENT ON COLUMN public.missions.validation IS 'Latest deterministic validation report for the generated project.';
COMMENT ON COLUMN public.missions.status IS 'Mission lifecycle status: draft, planned, building, ready, needs-fix or published.';

CREATE INDEX IF NOT EXISTS missions_user_status_idx ON public.missions(user_id, status);
