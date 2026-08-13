-- OAuth tokens are server-managed credentials. Clients receive status only through Edge Functions.

DROP POLICY IF EXISTS "Users can view own integrations." ON public.integrations;
REVOKE SELECT ON TABLE public.integrations FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.list_my_integration_status()
RETURNS TABLE (
  provider text,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.provider, i.metadata, i.created_at, i.updated_at
  FROM public.integrations AS i
  WHERE i.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.list_my_integration_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_my_integration_status() TO authenticated;

COMMENT ON TABLE public.integrations IS 'Server-managed OAuth credentials. Never expose access_token or refresh_token to browser clients.';
