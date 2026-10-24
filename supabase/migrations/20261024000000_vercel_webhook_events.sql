-- Store minimal metadata from authenticated Vercel integration webhooks.
CREATE TABLE IF NOT EXISTS public.vercel_webhook_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  event_created_at TIMESTAMPTZ,
  deployment_id TEXT,
  deployment_url TEXT,
  project_id TEXT,
  project_name TEXT,
  target TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vercel_webhook_events_received_at_idx
  ON public.vercel_webhook_events (received_at DESC);

ALTER TABLE public.vercel_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.vercel_webhook_events FROM anon, authenticated;
GRANT ALL ON TABLE public.vercel_webhook_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.vercel_webhook_events_id_seq TO service_role;
