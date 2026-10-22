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
  const hasEnv = (...names: string[]) =>
    names.some((name) => Boolean(Deno.env.get(name)?.trim()));
  const encryptionKeyReady = () => {
    const encoded = Deno.env.get("INTEGRATION_ENCRYPTION_KEY")?.trim() ?? "";
    if (!encoded) return false;
    try {
      const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
      return decoded.length === 32;
    } catch {
      return false;
    }
  };
  const oauthStorageReady = () =>
    Boolean(
      Deno.env.get("SUPABASE_URL")?.trim() &&
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim()
    ) && encryptionKeyReady();
  const providerServerReady = (provider: string) => {
    switch (provider) {
      case "github":
        return oauthStorageReady() &&
          hasEnv("GITHUB_OAUTH_CLIENT_ID", "GITHUB_CLIENT_ID") &&
          hasEnv("GITHUB_OAUTH_CLIENT_SECRET", "GITHUB_CLIENT_SECRET");
      case "canva":
        return oauthStorageReady() && hasEnv("CANVA_CLIENT_ID") && hasEnv("CANVA_CLIENT_SECRET");
      case "figma":
        return oauthStorageReady() && hasEnv("FIGMA_CLIENT_ID") && hasEnv("FIGMA_CLIENT_SECRET");
      case "google":
      case "google-drive":
        return oauthStorageReady() &&
          hasEnv("GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_CLIENT_ID") &&
          hasEnv("GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET");
      case "notion":
        return oauthStorageReady() && hasEnv("NOTION_CLIENT_ID") && hasEnv("NOTION_CLIENT_SECRET");
      case "slack":
        return oauthStorageReady() && hasEnv("SLACK_CLIENT_ID") && hasEnv("SLACK_CLIENT_SECRET");
      case "vercel":
        return oauthStorageReady() &&
          hasEnv("VERCEL_APP_CLIENT_ID", "NEXT_PUBLIC_VERCEL_APP_CLIENT_ID") &&
          hasEnv("VERCEL_APP_CLIENT_SECRET");
      case "stripe":
        return hasEnv("STRIPE_SECRET_KEY");
      case "supabase":
        return Boolean(
          Deno.env.get("SUPABASE_URL")?.trim() &&
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim()
        );
      default:
        return false;
    }
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
    const serverReady = providerServerReady(canonical);
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

  for (const provider of [
    "github", "canva", "figma", "google", "notion", "slack", "vercel", "stripe", "supabase",
  ]) {
    const canonical = canonicalProvider(provider);
    if (result.has(canonical)) continue;
    result.set(canonical, {
      displayName: canonical,
      status: "disconnected",
      connectedAt: null,
      expiresAt: null,
      metadata: {},
      serverReady: providerServerReady(provider),
    });
  }

  return corsResponse({
    integrations: Array.from(result.entries()).map(([provider, value]) => ({
      provider,
      ...value,
    })),
  }, 200, request);
});
