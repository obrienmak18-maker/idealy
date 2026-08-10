import { createClient } from '@supabase/supabase-js';

let client: ReturnType<typeof createClient> | null = null;

/** Uses only public browser configuration; server secrets never belong in Vite. */
export const getSupabaseClient = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Idealy] Supabase frontend configuration is missing.');
    return null;
  }

  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        persistSession: true,
      },
    });
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
