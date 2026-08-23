-- ═══════════════════════════════════════════════════════════════════════════
-- Fix pour la table missions existante
-- Adapte la structure existante pour correspondre au schéma attendu
-- ═══════════════════════════════════════════════════════════════════════════

-- Renommer owner_id en user_id si la colonne owner_id existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'missions' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE public.missions RENAME COLUMN owner_id TO user_id;
  END IF;
END $$;

-- Ajouter la colonne updated_at si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'missions' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.missions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- S'assurer que created_at est TIMESTAMPTZ
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'missions' AND column_name = 'created_at' AND data_type = 'bigint'
  ) THEN
    ALTER TABLE public.missions ALTER COLUMN created_at TYPE TIMESTAMPTZ USING to_timestamp(created_at / 1000);
  END IF;
END $$;

-- Recréer les politiques RLS pour missions
DROP POLICY IF EXISTS "Users can create their own missions" ON public.missions;
DROP POLICY IF EXISTS "Users can view their own missions" ON public.missions;
DROP POLICY IF EXISTS "Users can update their own missions" ON public.missions;
DROP POLICY IF EXISTS "Users can delete their own missions" ON public.missions;
DROP POLICY IF EXISTS "Users can view own missions." ON public.missions;
DROP POLICY IF EXISTS "Users can insert own missions." ON public.missions;
DROP POLICY IF EXISTS "Users can update own missions." ON public.missions;
DROP POLICY IF EXISTS "Users can delete own missions." ON public.missions;

CREATE POLICY "Users can view own missions."
  ON public.missions FOR SELECT USING ( auth.uid() = user_id );

CREATE POLICY "Users can insert own missions."
  ON public.missions FOR INSERT WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can update own missions."
  ON public.missions FOR UPDATE USING ( auth.uid() = user_id );

CREATE POLICY "Users can delete own missions."
  ON public.missions FOR DELETE USING ( auth.uid() = user_id );

-- Recréer le trigger updated_at
DROP TRIGGER IF EXISTS missions_updated_at ON public.missions;
CREATE TRIGGER missions_updated_at
  BEFORE UPDATE ON public.missions
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
