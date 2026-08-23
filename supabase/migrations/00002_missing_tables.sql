-- ═══════════════════════════════════════════════════════════════════════════
-- Idealy — Migration complète des tables manquantes
-- Colle ce fichier en ENTIER dans l'éditeur SQL Supabase et clique "Run"
-- Idempotent : peut être relancé sans erreur
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────
-- 1. MISSIONS TABLE (avec colonne schema JSONB)
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nouvelle mission',
  way TEXT,
  schema JSONB,
  preview_ready BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own missions." ON public.missions;
CREATE POLICY "Users can view own missions."
  ON public.missions FOR SELECT USING ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Users can insert own missions." ON public.missions;
CREATE POLICY "Users can insert own missions."
  ON public.missions FOR INSERT WITH CHECK ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Users can update own missions." ON public.missions;
CREATE POLICY "Users can update own missions."
  ON public.missions FOR UPDATE USING ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Users can delete own missions." ON public.missions;
CREATE POLICY "Users can delete own missions."
  ON public.missions FOR DELETE USING ( auth.uid() = user_id );

-- ─────────────────────────────────────────────────
-- 2. INTEGRATIONS TABLE (tokens OAuth chiffrés)
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, provider)
);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own integrations." ON public.integrations;
CREATE POLICY "Users can view own integrations."
  ON public.integrations FOR SELECT USING ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Users can insert own integrations." ON public.integrations;
CREATE POLICY "Users can insert own integrations."
  ON public.integrations FOR INSERT WITH CHECK ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Users can update own integrations." ON public.integrations;
CREATE POLICY "Users can update own integrations."
  ON public.integrations FOR UPDATE USING ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Users can delete own integrations." ON public.integrations;
CREATE POLICY "Users can delete own integrations."
  ON public.integrations FOR DELETE USING ( auth.uid() = user_id );

-- ─────────────────────────────────────────────────
-- 3. OAUTH_STATES TABLE (CSRF protection)
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  state TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only for oauth_states." ON public.oauth_states;
CREATE POLICY "Service role only for oauth_states."
  ON public.oauth_states USING ( false );

-- Auto-expire: delete states older than 10 minutes
CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_states()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.oauth_states WHERE created_at < now() - INTERVAL '10 minutes';
END;
$$;

-- ─────────────────────────────────────────────────
-- 4. STRIPE_CUSTOMERS TABLE
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  plan TEXT DEFAULT 'free',
  billing_cycle TEXT DEFAULT 'monthly',
  subscription_status TEXT DEFAULT 'inactive',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own stripe data." ON public.stripe_customers;
CREATE POLICY "Users can view own stripe data."
  ON public.stripe_customers FOR SELECT USING ( auth.uid() = user_id );

-- ─────────────────────────────────────────────────
-- 5. ENERGY POLICIES — ajouter UPDATE (manquant)
-- ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can update their own energy." ON public.user_energy;
CREATE POLICY "Users can update their own energy."
  ON public.user_energy FOR UPDATE USING ( auth.uid() = id );

-- ─────────────────────────────────────────────────
-- 6. TRIGGER updated_at pour missions
-- ─────────────────────────────────────────────────
DROP TRIGGER IF EXISTS missions_updated_at ON public.missions;
CREATE TRIGGER missions_updated_at
  BEFORE UPDATE ON public.missions
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS integrations_updated_at ON public.integrations;
CREATE TRIGGER integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS stripe_customers_updated_at ON public.stripe_customers;
CREATE TRIGGER stripe_customers_updated_at
  BEFORE UPDATE ON public.stripe_customers
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
