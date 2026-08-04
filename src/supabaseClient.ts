import { createClient } from '@supabase/supabase-js';

// Initialisation lazy du client pour s'assurer qu'il utilise les clés du store local
export const getSupabaseClient = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials are missing. Please configure them in Settings -> Connectors.');
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
};
