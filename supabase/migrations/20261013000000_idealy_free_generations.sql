-- Migration: 20261013000000_idealy_free_generations.sql
-- Table to track free generation quotas per user with idempotency and refund capabilities.

CREATE TABLE IF NOT EXISTS public.idealy_free_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  action_type TEXT NOT NULL DEFAULT 'generation',
  status TEXT NOT NULL DEFAULT 'reserved', -- 'reserved', 'completed', 'refunded'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_idealy_free_generations_user_status
  ON public.idealy_free_generations(user_id, status);

ALTER TABLE public.idealy_free_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own free generations"
  ON public.idealy_free_generations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
