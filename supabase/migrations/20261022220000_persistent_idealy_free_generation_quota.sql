-- Persist free-generation usage across serverless instances and deployments.
-- All quota writes are performed through service-role-only RPCs; the browser never
-- receives a service-role credential.

CREATE TABLE IF NOT EXISTS public.idealy_free_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  action_type TEXT NOT NULL DEFAULT 'generation',
  status TEXT NOT NULL DEFAULT 'reserved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT idealy_free_generations_status_check
    CHECK (status IN ('reserved', 'completed', 'refunded'))
);

CREATE INDEX IF NOT EXISTS idx_idealy_free_generations_user_status
  ON public.idealy_free_generations(user_id, status);

DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.idealy_free_generations'::regclass
       AND conname = 'idealy_free_generations_status_check'
  ) THEN
    ALTER TABLE public.idealy_free_generations
      ADD CONSTRAINT idealy_free_generations_status_check
      CHECK (status IN ('reserved', 'completed', 'refunded'));
  END IF;
END;
$;


ALTER TABLE public.idealy_free_generations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own free generations"
  ON public.idealy_free_generations;
CREATE POLICY "Users can view their own free generations"
  ON public.idealy_free_generations
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
GRANT SELECT ON TABLE public.idealy_free_generations TO authenticated;

CREATE OR REPLACE FUNCTION public.get_idealy_free_generation_status(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  allowed BOOLEAN,
  quota_limit INTEGER,
  remaining INTEGER,
  used INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 5), 1), 100);
  v_used INTEGER;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'A user ID is required';
  END IF;

  SELECT COUNT(*)::INTEGER
    INTO v_used
    FROM public.idealy_free_generations AS generation
   WHERE generation.user_id = p_user_id
     AND generation.status IN ('reserved', 'completed');

  RETURN QUERY
    SELECT
      v_used < v_limit,
      v_limit,
      GREATEST(v_limit - v_used, 0),
      v_used,
      CASE WHEN v_used >= v_limit
        THEN 'Vous avez atteint votre limite de générations gratuites. Les offres payantes arrivent bientôt. Votre progression est sauvegardée.'
        ELSE NULL
      END;
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_idealy_free_generation(
  p_user_id UUID,
  p_idempotency_key TEXT,
  p_action_type TEXT DEFAULT 'generation',
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  allowed BOOLEAN,
  quota_limit INTEGER,
  remaining INTEGER,
  used INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 5), 1), 100);
  v_action_type TEXT := COALESCE(NULLIF(BTRIM(p_action_type), ''), 'generation');
  v_existing_status TEXT;
  v_existing_found BOOLEAN;
  v_used INTEGER;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'A user ID is required';
  END IF;
  IF p_idempotency_key IS NULL OR BTRIM(p_idempotency_key) = ''
    OR LENGTH(p_idempotency_key) > 180 THEN
    RAISE EXCEPTION 'Invalid idempotency key';
  END IF;
  IF LENGTH(v_action_type) > 64 THEN
    RAISE EXCEPTION 'Invalid quota action type';
  END IF;

  -- Serialize reservations per user so concurrent requests cannot exceed quota.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::TEXT, 0));

  SELECT generation.status
    INTO v_existing_status
    FROM public.idealy_free_generations AS generation
   WHERE generation.user_id = p_user_id
     AND generation.idempotency_key = p_idempotency_key
   FOR UPDATE;
  v_existing_found := FOUND;

  -- Retries for an active reservation or completed message are idempotent.
  IF v_existing_found AND v_existing_status IN ('reserved', 'completed') THEN
    SELECT COUNT(*)::INTEGER
      INTO v_used
      FROM public.idealy_free_generations AS generation
     WHERE generation.user_id = p_user_id
       AND generation.status IN ('reserved', 'completed');

    RETURN QUERY SELECT TRUE, v_limit, GREATEST(v_limit - v_used, 0), v_used, NULL::TEXT;
    RETURN;
  END IF;

  SELECT COUNT(*)::INTEGER
    INTO v_used
    FROM public.idealy_free_generations AS generation
   WHERE generation.user_id = p_user_id
     AND generation.status IN ('reserved', 'completed');

  IF v_used >= v_limit THEN
    RETURN QUERY
      SELECT FALSE, v_limit, 0, v_used,
        'Vous avez atteint votre limite de générations gratuites. Les offres payantes arrivent bientôt. Votre progression est sauvegardée.';
    RETURN;
  END IF;

  IF v_existing_found THEN
    -- A failed generation can retry with the same idempotency key only after
    -- its reservation was explicitly refunded.
    UPDATE public.idealy_free_generations AS generation
       SET action_type = v_action_type,
           status = 'reserved',
           created_at = now(),
           completed_at = NULL
     WHERE generation.user_id = p_user_id
       AND generation.idempotency_key = p_idempotency_key;
  ELSE
    INSERT INTO public.idealy_free_generations (
      user_id, idempotency_key, action_type, status, created_at
    ) VALUES (
      p_user_id, p_idempotency_key, v_action_type, 'reserved', now()
    );
  END IF;

  SELECT COUNT(*)::INTEGER
    INTO v_used
    FROM public.idealy_free_generations AS generation
   WHERE generation.user_id = p_user_id
     AND generation.status IN ('reserved', 'completed');

  RETURN QUERY SELECT TRUE, v_limit, GREATEST(v_limit - v_used, 0), v_used, NULL::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.commit_idealy_free_generation(
  p_user_id UUID,
  p_idempotency_key TEXT
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.idealy_free_generations
     SET status = 'completed',
         completed_at = now()
   WHERE user_id = p_user_id
     AND idempotency_key = p_idempotency_key
     AND status = 'reserved';
$$;

CREATE OR REPLACE FUNCTION public.refund_idealy_free_generation(
  p_user_id UUID,
  p_idempotency_key TEXT
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.idealy_free_generations
     SET status = 'refunded',
         completed_at = NULL
   WHERE user_id = p_user_id
     AND idempotency_key = p_idempotency_key
     AND status = 'reserved';
$$;

REVOKE ALL ON FUNCTION public.get_idealy_free_generation_status(UUID, INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_idealy_free_generation(UUID, TEXT, TEXT, INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.commit_idealy_free_generation(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_idealy_free_generation(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_idealy_free_generation_status(UUID, INTEGER)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_idealy_free_generation(UUID, TEXT, TEXT, INTEGER)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.commit_idealy_free_generation(UUID, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_idealy_free_generation(UUID, TEXT)
  TO service_role;
