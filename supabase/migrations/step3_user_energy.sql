-- ÉTAPE 3 : Table user_energy (colle ce bloc seul, clique Run)
CREATE TABLE IF NOT EXISTS public.user_energy (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_energy INTEGER NOT NULL DEFAULT 100,
  max_energy INTEGER NOT NULL DEFAULT 100,
  last_refill DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.user_energy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own energy." ON public.user_energy;
CREATE POLICY "Users can view their own energy."
  ON public.user_energy FOR SELECT USING ( auth.uid() = id );
