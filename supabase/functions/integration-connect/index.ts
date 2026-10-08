import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticate } from "../_shared/auth.ts";
import { corsResponse, optionsResponse } from "../_shared/cors.ts";

function encodeBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sha256(value: string): Promise<string> {
  return encodeBase64Url(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
}

function randomString(byteLength = 48) {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

function env(name: string) {
  return Deno.env.get(name)?.trim() ?? "";
}

type ProviderConfig = {
  storageProvider: string;
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  scopes: string;
  usePkce: boolean;
  extraParams?: Record<string, string>;
};

function getProviderConfig(provider: string): ProviderConfig | null {
  switch (provider) {
    case "github":
      return {
        storageProvider: "github",
        clientId: env("GITHUB_OAUTH_CLIENT_ID") || env("GITHUB_CLIENT_ID"),
        clientSecret: env("GITHUB_OAUTH_CLIENT_SECRET") || env("GITHUB_CLIENT_SECRET"),
        authorizationUrl: "https://github.com/login/oauth/authorize",
        scopes: "repo read:user",
        usePkce: false,
      };
    case "canva":
      return {
        storageProvider: "canva",
        clientId: env("CANVA_CLIENT_ID"),
        clientSecret: env("CANVA_CLIENT_SECRET"),
        authorizationUrl: "https://www.canva.com/api/oauth/authorize",
        scopes: "design:content:read design:content:write asset:read asset:write profile:read",
        usePkce: true,
      };
    case "figma":
      return {
        storageProvider: "figma",
        clientId: env("FIGMA_CLIENT_ID"),
        clientSecret: env("FIGMA_CLIENT_SECRET"),
        authorizationUrl: "https://www.figma.com/oauth",
        scopes: "file_content:read,current_user:read",
        usePkce: true,
      };
    case "google-drive":
      return {
        storageProvider: "google",
        clientId: env("GOOGLE_OAUTH_CLIENT_ID") || env("GOOGLE_CLIENT_ID"),
        clientSecret: env("GOOGLE_OAUTH_CLIENT_SECRET") || env("GOOGLE_CLIENT_SECRET"),
        authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        scopes: "openid email profile https://www.googleapis.com/auth/drive.metadata.readonly",
        usePkce: true,
        extraParams: {
          access_type: "offline",
          prompt: "consent",
        },
      };
    case "notion":
      return {
        storageProvider: "notion",
        clientId: env("NOTION_CLIENT_ID"),
        clientSecret: env("NOTION_CLIENT_SECRET"),
        authorizationUrl: "https://api.notion.com/v1/oauth/authorize",
        scopes: "",
        usePkce: false,
        extraParams: { owner: "user" },
      };
    case "slack":
      return {
        storageProvider: "slack",
        clientId: env("SLACK_CLIENT_ID"),
        clientSecret: env("SLACK_CLIENT_SECRET"),
        authorizationUrl: "https://slack.com/oauth/v2/authorize",
        scopes: "",
        usePkce: false,
        extraParams: { user_scope: "channels:read,chat:write" },
      };
    default:
      return null;
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST") {
    return corsResponse({ error: "Method not allowed" }, 405, request);
  }

  const auth = await authenticate(request);
  if ("error" in auth) {
    return corsResponse({ error: auth.error }, auth.status, request);
  }

  const body = await request.json().catch(() => null) as { provider?: unknown } | null;
  const requestedProvider =
    typeof body?.provider === "string" ? body.provider.trim().toLowerCase() : "github";

  const config = getProviderConfig(requestedProvider);
  if (!config) {
    return corsResponse({ error: "Connector OAuth is not configured for this provider." }, 404, request);
  }

  const supabaseUrl = env("SUPABASE_URL");
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey || !config.clientId || !config.clientSecret) {
    return corsResponse(
      { error: `${requestedProvider} OAuth is not configured on the server.` },
      503,
      request,
    );
  }

  try {
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const state = randomString(48);
    const stateHash = await sha256(state);
    const redirectUri = `${supabaseUrl}/functions/v1/integration-callback`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const codeVerifier = config.usePkce ? randomString(64) : null;
    const codeChallenge = codeVerifier ? await sha256(codeVerifier) : null;

    const { error: insertError } = await admin
      .from("integration_oauth_states")
      .insert({
        user_id: auth.user.id,
        provider: config.storageProvider,
        state_hash: stateHash,
        redirect_uri: redirectUri,
        expires_at: expiresAt,
        metadata: {
          requested_provider: requestedProvider,
          code_verifier: codeVerifier,
          code_challenge: codeChallenge,
        },
      });

    if (insertError) {
      console.error("integration-connect state insert failed", insertError);
      return corsResponse({ error: "Unable to start connector connection." }, 500, request);
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      state,
    });

    if (config.scopes) params.set(
      requestedProvider === "figma" ? "scope" : "scope",
      config.scopes,
    );

    for (const [key, value] of Object.entries(config.extraParams ?? {})) {
      params.set(key, value);
    }

    if (codeChallenge) {
      params.set("code_challenge", codeChallenge);
      params.set("code_challenge_method", "S256");
    }

    return corsResponse(
      {
        provider: requestedProvider,
        url: `${config.authorizationUrl}?${params.toString()}`,
        expiresAt,
      },
      200,
      request,
    );
  } catch (error) {
    console.error("integration-connect failed", error);
    return corsResponse({ error: "Unable to start connector OAuth." }, 500, request);
  }
});
