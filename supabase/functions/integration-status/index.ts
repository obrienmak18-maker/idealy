import { authenticate } from '../_shared/auth.ts';
import { corsResponse, optionsResponse } from '../_shared/cors.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse(request);
  if (request.method !== 'GET' && request.method !== 'POST') return corsResponse({ error: 'Method not allowed' }, 405, request);

  const auth = await authenticate(request);
  if ('error' in auth) return corsResponse({ error: auth.error }, auth.status, request);

  const { data, error } = await auth.supabase
    .from('user_integrations')
    .select('provider, display_name, status, last_verified_at, expires_at, updated_at, metadata')
    .eq('user_id', auth.user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('integration-status failed', error.message);
    return corsResponse({ error: 'Unable to read connector status.' }, 500, request);
  }

  return corsResponse({
    integrations: (data ?? []).map((integration: {
      provider: string;
      display_name?: string | null;
      status?: string | null;
      last_verified_at?: string | null;
      expires_at?: string | null;
      updated_at?: string | null;
      metadata?: Record<string, unknown> | null;
    }) => ({
      provider: integration.provider,
      displayName: integration.display_name ?? integration.provider,
      status: integration.status ?? 'active',
      connectedAt: integration.last_verified_at ?? integration.updated_at ?? null,
      expiresAt: integration.expires_at ?? null,
      metadata: integration.metadata ?? {},
    })),
  }, 200, request);
});
