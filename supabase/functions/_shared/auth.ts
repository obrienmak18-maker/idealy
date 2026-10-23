import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function authenticate(request: Request) {
  const authHeader = request.headers.get('Authorization')?.trim();
  if (!authHeader || !/^Bearer\s+\S+$/i.test(authHeader)) {
    return { error: 'Unauthorized', status: 401 } as const;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim();
  if (!supabaseUrl || !anonKey) {
    console.error('Supabase authentication is not configured for this Edge Function.');
    return { error: 'Authentication service unavailable', status: 503 } as const;
  }

  // Preserve the caller's JWT on PostgREST requests so database queries use
  // the authenticated role and the user's RLS policies, not the anon role.
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return { error: 'Unauthorized', status: 401 } as const;
  }

  return { user, supabase } as const;
}