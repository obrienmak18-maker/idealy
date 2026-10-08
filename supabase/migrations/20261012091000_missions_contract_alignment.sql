-- Compatibility alignment for the existing Idealy live missions table.
-- The live project predates the current missions contract; this migration is
-- additive and preserves all existing rows and policies.

ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Nouvelle mission',
  ADD COLUMN IF NOT EXISTS way TEXT NOT NULL DEFAULT 'professional',
  ADD COLUMN IF NOT EXISTS preview_ready BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS schema JSONB,
  ADD COLUMN IF NOT EXISTS brief JSONB,
  ADD COLUMN IF NOT EXISTS contracts JSONB,
  ADD COLUMN IF NOT EXISTS dna JSONB,
  ADD COLUMN IF NOT EXISTS snapshots JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS validation JSONB,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS execution_id TEXT,
  ADD COLUMN IF NOT EXISTS max_concurrent_tasks SMALLINT NOT NULL DEFAULT 3;

UPDATE public.missions
SET
  title = COALESCE(NULLIF(title, ''), 'Nouvelle mission'),
  way = CASE
    WHEN lower(way) IN ('mage','ninja','hunter','professional') THEN lower(way)
    ELSE 'professional'
  END,
  snapshots = COALESCE(snapshots, '[]'::jsonb),
  max_concurrent_tasks = LEAST(16, GREATEST(1, COALESCE(max_concurrent_tasks, 3))),
  updated_at = COALESCE(updated_at, now());

ALTER TABLE public.missions
  ALTER COLUMN title SET DEFAULT 'Nouvelle mission',
  ALTER COLUMN way SET DEFAULT 'professional',
  ALTER COLUMN preview_ready SET DEFAULT FALSE,
  ALTER COLUMN snapshots SET DEFAULT '[]'::jsonb,
  ALTER COLUMN status SET DEFAULT 'draft',
  ALTER COLUMN max_concurrent_tasks SET DEFAULT 3;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.missions'::regclass
      AND conname = 'missions_way_check'
  ) THEN
    ALTER TABLE public.missions
      ADD CONSTRAINT missions_way_check
      CHECK (way IN ('mage','ninja','hunter','professional'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.missions'::regclass
      AND conname = 'missions_max_concurrent_tasks_check'
  ) THEN
    ALTER TABLE public.missions
      ADD CONSTRAINT missions_max_concurrent_tasks_check
      CHECK (max_concurrent_tasks BETWEEN 1 AND 16);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.missions'::regclass
      AND conname = 'missions_status_check'
  ) THEN
    ALTER TABLE public.missions
      ADD CONSTRAINT missions_status_check CHECK (status IN (
        'draft','planned','running','waiting','verifying','completed',
        'failed','cancelled','blocked','building','ready','needs-fix','published'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS missions_user_status_idx
  ON public.missions(user_id, status);
CREATE INDEX IF NOT EXISTS missions_execution_id_idx
  ON public.missions(execution_id)
  WHERE execution_id IS NOT NULL;
