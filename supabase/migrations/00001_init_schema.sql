-- Migration 00001_init_schema.sql
-- Description: Initialize user profiles and energy system.
-- Safe to run on existing databases.

-- ─────────────────────────────────────────────────
-- PROFILES TABLE
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_hue INTEGER DEFAULT 0,
  way TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT USING ( true );

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT WITH CHECK ( auth.uid() = id );

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE USING ( auth.uid() = id );

-- ─────────────────────────────────────────────────
-- USER_ENERGY TABLE
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_energy (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_energy INTEGER NOT NULL DEFAULT 100,
  max_energy INTEGER NOT NULL DEFAULT 100,
  last_refill DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_energy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own energy." ON public.user_energy;
CREATE POLICY "Users can view their own energy."
  ON public.user_energy FOR SELECT USING ( auth.uid() = id );

-- ─────────────────────────────────────────────────
-- FUNCTION & TRIGGER: auto-create profile on signup
-- ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_hue)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    floor(random() * 360)::int
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_energy (id, current_energy, max_energy)
  VALUES (new.id, 100, 100)
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─────────────────────────────────────────────────
-- FUNCTION & TRIGGER: auto-update updated_at
-- ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_energy_updated_at ON public.user_energy;
CREATE TRIGGER user_energy_updated_at
  BEFORE UPDATE ON public.user_energy
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
