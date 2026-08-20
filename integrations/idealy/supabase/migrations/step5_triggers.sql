-- ÉTAPE 5 : Triggers (colle ce bloc seul, clique Run)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

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
