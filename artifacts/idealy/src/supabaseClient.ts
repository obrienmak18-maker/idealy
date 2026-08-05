import { createClient } from '@supabase/supabase-js';
import { useIdealyStore } from '@/stores/idealyStore';

/**
 * Returns a configured Supabase client.
 *
 * Priority:
 *  1. VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (build-time env vars, e.g. for deployment)
 *  2. Keys entered by the user in Settings → Connectors (stored in Zustand / localStorage)
 *
 * This dual-source approach allows the app to work both with env vars (CI/CD)
 * and with keys the user pastes into the UI at runtime.
 */
export const getSupabaseClient = () => {
  let supabaseUrl: string | undefined = import.meta.env.VITE_SUPABASE_URL;
  let supabaseAnonKey: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Fall back to user-configured keys stored via the Connectors panel / Settings modal
  if (!supabaseUrl || !supabaseAnonKey) {
    const { connectors } = useIdealyStore.getState();
    supabaseUrl = connectors.supabaseUrl;
    supabaseAnonKey = connectors.supabaseAnonKey;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      '[Idealy] Supabase credentials are missing. ' +
        'Configure them in Settings → Connectors → Supabase.',
    );
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
};
