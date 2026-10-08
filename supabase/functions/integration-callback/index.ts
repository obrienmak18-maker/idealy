import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptIntegrationToken } from "../_shared/integrationCrypto.ts";

const APP_ORIGIN =
  Deno.env.get("APP_ORIGIN") ??
  Deno.env.get("APP_URL") ??
  "http://localhost:3000";

function redirect(query: string) {
  return Response.redirect(APP_ORIGIN.replace(/\/$/, "") + "?" + query);
}

function env(name: string) {
  return Deno.env.get(name)?.trim() ?? "";
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function basicAuth(clientId: string, clientSecret: string) {
  return "Basic " + btoa(clientId + ":" + clientSecret);
}

type TokenResult = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
  owner?: { user?: { id?: string; name?: string; person?: { email?: string } } };
  bot_id?: string;
  workspace_id?: string;
  workspace_name?: string;
  authed_user?: { id?: string; access_token?: string };
  team?: { id?: string; name?: string };
  error?: string;
};

function providerConfig(provider: string) {
  switch (provider) {
    case "github":
      return {
        clientId: env("GITHUB_OAUTH_CLIENT_ID") || env("GITHUB_CLIENT_ID"),
        clientSecret: env("GITHUB_OAUTH_CLIENT_SECRET") || env("GITHUB_CLIENT_SECRET"),
        tokenUrl: "https://github.com/login/oauth/access_token",
        needsBasic: false,
      };
    case "canva":
      return {
        clientId: env("CANVA_CLIENT_ID"),
        clientSecret: env("CANVA_CLIENT_SECRET"),
        tokenUrl: "https://api.canva.com/rest/v1/oauth/token",
        needsBasic: true,
      };
    case "figma":
      return {
        clientId: env("FIGMA_CLIENT_ID"),
        clientSecret: env("FIGMA_CLIENT_SECRET"),
        tokenUrl: "https://api.figma.com/v1/oauth/token",
        needsBasic: true,
      };
    case "google":
      return {
        clientId: env("GOOGLE_OAUTH_CLIENT_ID") || env("GOOGLE_CLIENT_ID"),
        clientSecret: env("GOOGLE_OAUTH_CLIENT_SECRET") || env("GOOGLE_CLIENT_SECRET"),
        tokenUrl: "https://oauth2.googleapis.com/token",
        needsBasic: false,
      };
    case "notion":
      return {
        clientId: env("NOTION_CLIENT_ID"),
        clientSecret: env("NOTION_CLIENT_SECRET"),
        tokenUrl: "https://api.notion.com/v1/oauth/token",
        needsBasic: true,
      };
    case "slack":
      return {
        clientId: env("SLACK_CLIENT_ID"),
        clientSecret: env("SLACK_CLIENT_SECRET"),
        tokenUrl: "https://slack.com/api/oauth.v2.access",
        needsBasic: false,
      };
    default:
      return null;
  }
}

async function identityFor(provider: string, token: TokenResult, accessToken: string) {
  if (provider === "github") {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: "Bearer " + accessToken,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    const profile = await response.json().catch(() => null) as { id?: number; login?: string; name?: string; email?: string } | null;
    if (!response.ok || !profile?.id) throw new Error("github_identity_failed");
    return {
      externalAccountId: String(profile.id),
      displayName: profile.name || profile.login || "GitHub",
      metadata: { login: profile.login ?? null, email: profile.email ?? null },
    };
  }

  if (provider === "canva") {
    const profileResponse = await fetch("https://api.canva.com/rest/v1/users/me/profile", {
      headers: { Authorization: "Bearer " + accessToken },
    });
    const profile = await profileResponse.json().catch(() => null) as { profile?: { display_name?: string } } | null;
    const accountResponse = await fetch("https://api.canva.com/rest/v1/users/me", {
      headers: { Authorization: "Bearer " + accessToken },
    });
    const identity = await accountResponse.json().catch(() => null) as { team_user?: { user_id?: string; team_id?: string } } | null;
    if (!profileResponse.ok || !accountResponse.ok || !identity?.team_user?.user_id) throw new Error("canva_identity_failed");
    return {
      externalAccountId: identity.team_user.user_id,
      displayName: profile?.profile?.display_name || "Canva",
      metadata: { teamId: identity.team_user.team_id ?? null },
    };
  }

  if (provider === "figma") {
    const response = await fetch("https://api.figma.com/v1/me", {
      headers: { Authorization: "Bearer " + accessToken },
    });
    const profile = await response.json().catch(() => null) as { id?: string; handle?: string; email?: string; img_url?: string } | null;
    if (!response.ok || !profile?.id) throw new Error("figma_identity_failed");
    return {
      externalAccountId: profile.id,
      displayName: profile.handle || profile.email || "Figma",
      metadata: { email: profile.email ?? null, avatar: profile.img_url ?? null },
    };
  }

  if (provider === "google") {
    const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: "Bearer " + accessToken },
    });
    const profile = await response.json().catch(() => null) as { sub?: string; name?: string; email?: string; picture?: string } | null;
    if (!response.ok || !profile?.sub) throw new Error("google_identity_failed");
    return {
      externalAccountId: profile.sub,
      displayName: profile.name || profile.email || "Google Drive",
      metadata: { email: profile.email ?? null, picture: profile.picture ?? null },
    };
  }

  if (provider === "notion") {
    const ownerId = token.owner?.user?.id || token.bot_id;
    if (!ownerId) throw new Error("notion_identity_failed");
    return {
      externalAccountId: ownerId,
      displayName: token.owner?.user?.name || token.owner?.user?.person?.email || token.workspace_name || "Notion",
      metadata: {
        workspaceId: token.workspace_id ?? null,
        workspaceName: token.workspace_name ?? null,
      },
    };
  }

  if (provider === "slack") {
    const response = await fetch("https://slack.com/api/auth.test", {
      headers: { Authorization: "Bearer " + accessToken },
    });
    const profile = await response.json().catch(() => null) as { ok?: boolean; user_id?: string; user?: string; team_id?: string; team?: string } | null;
    if (!profile?.ok || !profile.user_id) throw new Error("slack_identity_failed");
    return {
      externalAccountId: profile.user_id,
      displayName: profile.user || profile.team || "Slack",
      metadata: { teamId: profile.team_id ?? null, teamName: profile.team ?? null },
    };
  }

  throw new Error("unsupported_provider");
}

Deno.serve(async (request) => {
  if (request.method !== "GET") return redirect("error=method_not_allowed");

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const providerError = url.searchParams.get("error");

    if (providerError) return redirect("error=" + encodeURIComponent(providerError));
    if (!code || !state) return redirect("error=missing_code_or_state");

    const supabaseUrl = env("SUPABASE_URL");
    const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return redirect("error=oauth_server_not_configured");

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const stateHash = await sha256(state);
    const { data: oauthState, error: stateError } = await admin
      .from("integration_oauth_states")
      .select("id,user_id,provider,redirect_uri,expires_at,consumed_at,metadata")
      .eq("state_hash", stateHash)
      .maybeSingle();

    if (
      stateError ||
      !oauthState ||
      oauthState.consumed_at ||
      new Date(oauthState.expires_at).getTime() <= Date.now()
    ) return redirect("error=invalid_or_expired_state");

    const provider = oauthState.provider as string;
    const config = providerConfig(provider);
    if (!config || !config.clientId || !config.clientSecret) return redirect("error=provider_not_configured");

    const metadata =
      oauthState.metadata && typeof oauthState.metadata === "object"
        ? oauthState.metadata as Record<string, unknown>
        : {};

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: oauthState.redirect_uri,
    });

    if (!config.needsBasic) body.set("client_id", config.clientId);
    if (!config.needsBasic && config.clientSecret) body.set("client_secret", config.clientSecret);

    if (provider === "canva" || provider === "figma" || provider === "google") {
      const verifier = typeof metadata.code_verifier === "string" ? metadata.code_verifier : "";
      if (!verifier) return redirect("error=missing_pkce_state");
      body.set("code_verifier", verifier);
    }

    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(config.needsBasic ? { Authorization: basicAuth(config.clientId, config.clientSecret) } : {}),
        ...(provider === "github" ? { Accept: "application/json" } : {}),
      },
      body,
    });
    const tokenData = await tokenResponse.json().catch(() => null) as TokenResult | null;

    const accessToken = tokenData?.access_token ?? tokenData?.authed_user?.access_token ?? "";
    if (!tokenResponse.ok || !tokenData || !accessToken) {
      console.error("OAuth token exchange failed", provider, tokenResponse.status, tokenData?.error);
      return redirect("error=token_exchange_failed");
    }

    const identity = await identityFor(provider, tokenData, accessToken);
    const now = new Date();
    const expiresAt =
      typeof tokenData.expires_in === "number"
        ? new Date(now.getTime() + tokenData.expires_in * 1000).toISOString()
        : null;

    const encrypted = await encryptIntegrationToken(JSON.stringify({
      accessToken,
      refreshToken: tokenData.refresh_token ?? null,
      tokenType: tokenData.token_type ?? "Bearer",
      expiresAt,
      scope: tokenData.scope ?? null,
      provider,
    }));

    const scopes = String(tokenData.scope ?? "")
      .split(/[, ]+/)
      .map((scope) => scope.trim())
      .filter(Boolean);

    const { data: integration, error: integrationError } = await admin
      .from("user_integrations")
      .upsert({
        user_id: oauthState.user_id,
        provider,
        connection_type: "oauth",
        external_account_id: identity.externalAccountId,
        display_name: identity.displayName,
        credential_reference: "oauth:" + provider,
        scopes,
        status: "active",
        last_verified_at: now.toISOString(),
        expires_at: expiresAt,
        metadata: identity.metadata,
        updated_at: now.toISOString(),
      }, { onConflict: "user_id,provider" })
      .select("id")
      .single();

    if (integrationError || !integration) return redirect("error=storage_failed");

    const { error: credentialError } = await admin
      .from("integration_credentials")
      .upsert({
        integration_id: integration.id,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        algorithm: "AES-GCM-256",
        key_version: 1,
        rotated_at: now.toISOString(),
      }, { onConflict: "integration_id" });

    if (credentialError) return redirect("error=credential_storage_failed");

    const { error: consumeStateError } = await admin
      .from("integration_oauth_states")
      .update({ consumed_at: now.toISOString() })
      .eq("id", oauthState.id)
      .eq("user_id", oauthState.user_id)
      .is("consumed_at", null);

    if (consumeStateError) return redirect("error=state_consume_failed");

    return redirect(
      "connected=" + encodeURIComponent(provider) +
      "&display=" + encodeURIComponent(identity.displayName),
    );
  } catch (error) {
    console.error("integration-callback failed", error);
    return redirect("error=integration_callback_failed");
  }
});
