import { authenticate } from '../_shared/auth.ts';
import { corsResponse, optionsResponse } from '../_shared/cors.ts';

function canonicalProvider(provider: string) {
  return provider === 'google' ? 'google-drive' : provider;
}

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

  const now = Date.now();
  const providerRequirements: Record<string, string[]> = {
    github: ["GITHUB_OAUTH_CLIENT_ID", "GITHUB_OAUTH_CLIENT_SECRET"],
    canva: ["CANVA_CLIENT_ID", "CANVA_CLIENT_SECRET"],
    figma: ["FIGMA_CLIENT_ID", "FIGMA_CLIENT_SECRET"],
    google: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
    notion: ["NOTION_CLIENT_ID", "NOTION_CLIENT_SECRET"],
    slack: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"],
    vercel: ["VERCEL_APP_CLIENT_ID"],
    stripe: ["STRIPE_SECRET_KEY"],
    supabase: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  };

  const result = new Map<string, {
    displayName: string;
    status: string;
    connectedAt: string | null;
    expiresAt: string | null;
    metadata: Record<string, unknown>;
    serverReady: boolean;
  }>();

  for (const integration of data ?? []) {
    const canonical = canonicalProvider(integration.provider);
    const required = providerRequirements[integration.provider] ?? [];
    const serverReady = required.every((name) => Boolean(Deno.env.get(name)?.trim()));
    const expiresAt = integration.expires_at ?? null;
    const expired =
      Boolean(expiresAt) &&
      Number.isFinite(Date.parse(expiresAt)) &&
      Date.parse(expiresAt) <= now;

    result.set(canonical, {
      displayName: integration.display_name ?? integration.provider,
      status: expired ? "expired" : integration.status ?? "unknown",
      connectedAt: integration.last_verified_at ?? integration.updated_at ?? null,
      expiresAt,
      metadata: integration.metadata ?? {},
      serverReady,
    });
  }

  for (const [provider, required] of Object.entries(providerRequirements)) {
    const canonical = canonicalProvider(provider);
    if (result.has(canonical)) continue;
    result.set(canonical, {
      displayName: canonical,
      status: "disconnected",
      connectedAt: null,
      expiresAt: null,
      metadata: {},
      serverReady: required.every((name) => Boolean(Deno.env.get(name)?.trim())),
    });
  }

  return corsResponse({
    integrations: Array.from(result.entries()).map(([provider, value]) => ({
      provider,
      ...value,
    })),
  }, 200, request);
});
