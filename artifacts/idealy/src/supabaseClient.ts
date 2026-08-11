import { createClient } from '@supabase/supabase-js';
import { useIdealyStore } from '@/stores/idealyStore';

// These are public browser coordinates for the IDEALY Supabase project.
// Server-side secrets must never be placed here or in any Vite variable.
const DEFAULT_SUPABASE_URL = 'https://vhucjkyktdflwocrmzhe.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_276s95nUxgNgees9AzIP8g_VW53w9ee';

let client: ReturnType<typeof createClient> | null = null;
let clientConfig = { url: '', key: '' };

/**
 * Returns a configured Supabase client.
 *
 * Priority:
 *  1. VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from the deployment environment
 *  2. Values entered in Settings → Connectors and persisted locally
 *  3. The public IDEALY project configuration above
 */
export const getSupabaseClient = () => {
  const connectors = useIdealyStore.getState().connectors;
  const supabaseUrl = (
    import.meta.env.VITE_SUPABASE_URL || connectors.supabaseUrl || DEFAULT_SUPABASE_URL
  ).trim();
  const supabaseKey = (
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    connectors.supabaseAnonKey ||
    DEFAULT_SUPABASE_PUBLISHABLE_KEY
  ).trim();

  if (!supabaseUrl || !supabaseKey) {
    console.warn('[Idealy] Supabase frontend configuration is missing.');
    return null;
  }

  if (!client || clientConfig.url !== supabaseUrl || clientConfig.key !== supabaseKey) {
    client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        persistSession: true,
      },
    });
    clientConfig = { url: supabaseUrl, key: supabaseKey };
  }

  return client;
};
