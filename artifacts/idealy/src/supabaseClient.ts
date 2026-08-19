import { createClient } from '@supabase/supabase-js';
import { useIdealyStore } from '@/stores/idealyStore';
import { getFirebaseIdToken, isFirebaseAuthConfigured } from '@/firebaseAuth';

type IdealySupabaseClient = Omit<ReturnType<typeof createClient>, 'from'> & {
  from: (table: string) => any;
};

let client: IdealySupabaseClient | null = null;
let clientConfig = { url: '', key: '', firebaseConfigured: false };

const getRuntimeSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  const store = useIdealyStore.getState();
  const storedUrl = store.connectors.supabaseUrl?.trim();
  const storedKey = store.connectors.supabaseAnonKey?.trim();

  if (envUrl && envKey) {
    return { supabaseUrl: envUrl, supabaseAnonKey: envKey };
  }

  if (storedUrl && storedKey) {
    return { supabaseUrl: storedUrl, supabaseAnonKey: storedKey };
  }

  const persisted = typeof window !== 'undefined' ? window.localStorage.getItem('idealy-state') : null;
  if (persisted) {
    try {
      const parsed = JSON.parse(persisted) as { state?: { connectors?: { supabaseUrl?: string; supabaseAnonKey?: string } } };
      const persistedUrl = parsed?.state?.connectors?.supabaseUrl?.trim();
      const persistedKey = parsed?.state?.connectors?.supabaseAnonKey?.trim();
      if (persistedUrl && persistedKey) {
        return { supabaseUrl: persistedUrl, supabaseAnonKey: persistedKey };
      }
    } catch {
      // Ignore invalid localStorage format
    }
  }

  return {
    supabaseUrl: storedUrl || '',
    supabaseAnonKey: storedKey || '',
  };
};

/** Uses only public browser configuration; server secrets never belong in Vite. */
export const getSupabaseClient = (): IdealySupabaseClient | null => {
  const { supabaseUrl, supabaseAnonKey } = getRuntimeSupabaseConfig();

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Idealy] Supabase frontend configuration is missing.');
    return null;
  }

  const firebaseConfigured = isFirebaseAuthConfigured();
  if (!client || clientConfig.url !== supabaseUrl || clientConfig.key !== supabaseAnonKey || clientConfig.firebaseConfigured !== firebaseConfigured) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      ...(firebaseConfigured ? { accessToken: getFirebaseIdToken } : {}),
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        persistSession: true,
      },
    }) as IdealySupabaseClient;
    clientConfig = { url: supabaseUrl, key: supabaseAnonKey, firebaseConfigured };
  }

  return client;
};

export const signInWithGithub = async () => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      scopes: 'repo', // we need repo scope to push code if needed
      redirectTo: window.location.origin, // redirect back to idealy
    },
  });

  if (error) throw error;
  return data;
};

export const signInWithGoogle = async () => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase.auth.signOut();
};
