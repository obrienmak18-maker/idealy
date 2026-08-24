-- Keep production aligned with the first-request behaviour in billing_integrity.
CREATE OR REPLACE FUNCTION public.acquire_ai_request_slot(
  p_user_id UUID,
  p_minimum_interval_seconds INTEGER DEFAULT 3
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_request_at TIMESTAMPTZ;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid AI request identity';
  END IF;
  IF p_minimum_interval_seconds IS NULL
    OR p_minimum_interval_seconds < 1
    OR p_minimum_interval_seconds > 60 THEN
    RAISE EXCEPTION 'Invalid AI request interval';
  END IF;

  INSERT INTO public.user_energy (id, current_energy, max_energy, updated_at)
  VALUES (
    p_user_id,
    100,
    100,
    now() - make_interval(secs => p_minimum_interval_seconds)
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT updated_at
    INTO last_request_at
    FROM public.user_energy
   WHERE id = p_user_id
   FOR UPDATE;

  IF last_request_at > now() - make_interval(secs => p_minimum_interval_seconds) THEN
    RETURN FALSE;
  END IF;

  UPDATE public.user_energy
     SET updated_at = now()
   WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.acquire_ai_request_slot(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_ai_request_slot(UUID, INTEGER) TO service_role;
