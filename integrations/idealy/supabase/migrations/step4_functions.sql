-- ÉTAPE 4 : Fonction + Triggers (colle ce bloc seul, clique Run)
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
