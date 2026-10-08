-- Canonical chat-era persistence now runs through the Supabase PostgREST
-- service-role boundary in lib/db/queries.ts.
--
-- Browser/client roles must never read or mutate these legacy-shaped tables
-- directly. The Next.js server uses SUPABASE_SERVICE_ROLE_KEY after it has
-- already authenticated and authorized the caller.
--
-- These tables are present in the current production project for backwards
-- compatibility, but are intentionally absent from fresh canonical local
-- Supabase schema. The migration therefore hardens them only when present.

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'User',
    'Chat',
    'Message_v2',
    'Vote_v2',
    'Document',
    'Suggestion',
    'Stream'
  ]
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
      EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', table_name);
    END IF;
  END LOOP;
END
$$;

DO $$
BEGIN
  IF to_regclass('public."Chat"') IS NOT NULL THEN
    COMMENT ON TABLE public."Chat" IS
      'Idealy chat persistence. Accessed only by the authenticated Next.js server boundary; not exposed directly to browser roles.';
  END IF;
  IF to_regclass('public."Message_v2"') IS NOT NULL THEN
    COMMENT ON TABLE public."Message_v2" IS
      'Idealy chat message persistence. Accessed only by the authenticated Next.js server boundary.';
  END IF;
  IF to_regclass('public."Document"') IS NOT NULL THEN
    COMMENT ON TABLE public."Document" IS
      'Idealy artifact/document persistence. Accessed only by the authenticated Next.js server boundary.';
  END IF;
END
$$;
