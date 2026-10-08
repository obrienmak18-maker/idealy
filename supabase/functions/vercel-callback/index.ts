import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptIntegrationToken } from "../_shared/integrationCrypto.ts";

const APP_ORIGIN =
  Deno.env.get("APP_ORIGIN") ??
  Deno.env.get("APP_URL") ??
  "http://localhost:3000";

function redirect(query: string) {
  return Response.redirect(`${APP_ORIGIN.replace(/\/$/, "")}?${query}`);
}

function encodeBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sha256(value: string): Promise<string> {
  return encodeBase64Url(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
}

Deno.serve(async (request) => {
  if (request.method !== "GET") return redirect("error=method_not_allowed");

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) return redirect("error=missing_code_or_state");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const clientId =
      Deno.env.get("VERCEL_APP_CLIENT_ID") ??
      Deno.env.get("NEXT_PUBLIC_VERCEL_APP_CLIENT_ID") ??
      "";
    const clientSecret = Deno.env.get("VERCEL_APP_CLIENT_SECRET") ?? "";

    if (!supabaseUrl || !serviceRoleKey || !clientId) {
      return redirect("error=oauth_server_not_configured");
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const stateHash = await sha256(state);

    const { data: oauthState, error: stateError } = await admin
      .from("integration_oauth_states")
      .select("id,user_id,provider,redirect_uri,expires_at,consumed_at,metadata")
      .eq("state_hash", stateHash)
      .eq("provider", "vercel")
      .maybeSingle();

    if (
      stateError ||
      !oauthState ||
      oauthState.consumed_at ||
      new Date(oauthState.expires_at).getTime() <= Date.now()
    ) {
      return redirect("error=invalid_or_expired_state");
    }

    const metadata =
      oauthState.metadata && typeof oauthState.metadata === "object"
        ? (oauthState.metadata as Record<string, unknown>)
        : {};
    const codeVerifier =
      typeof metadata.code_verifier === "string"
        ? metadata.code_verifier
        : "";

    if (!codeVerifier) return redirect("error=missing_pkce_state");

    const { data: consumedState, error: consumeError } = await admin
      .from("integration_oauth_states")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", oauthState.id)
      .is("consumed_at", null)
      .select("id")
      .maybeSingle();

    if (consumeError || !consumedState) {
      return redirect("error=state_already_consumed");
    }

    const tokenResponse = await fetch(
      "https://api.vercel.com/login/oauth/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: clientId,
          ...(clientSecret ? { client_secret: clientSecret } : {}),
          code,
          code_verifier: codeVerifier,
          redirect_uri: oauthState.redirect_uri,
        }),
      },
    );

    const tokenData = (await tokenResponse.json().catch(() => null)) as {
      access_token?: string;
      refresh_token?: string;
      token_type?: string;
      scope?: string;
      expires_in?: number;
      id_token?: string;
      error?: string;
    } | null;

    if (!tokenResponse.ok || !tokenData?.access_token) {
      console.error(
        "Vercel token exchange failed",
        tokenData?.error ?? tokenResponse.status,
      );
      return redirect("error=token_exchange_failed");
    }

    const userResponse = await fetch(
      "https://api.vercel.com/login/oauth/userinfo",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: "application/json",
        },
      },
    );

    const vercelUser = (await userResponse.json().catch(() => null)) as {
      sub?: string;
      email?: string;
      name?: string;
      preferred_username?: string;
      picture?: string;
    } | null;

    if (!userResponse.ok || !vercelUser?.sub) {
      console.error("Vercel identity verification failed", userResponse.status);
      return redirect("error=identity_verification_failed");
    }

    const now = new Date();
    const expiresAt =
      typeof tokenData.expires_in === "number"
        ? new Date(now.getTime() + tokenData.expires_in * 1000).toISOString()
        : null;

    const encrypted = await encryptIntegrationToken(
      JSON.stringify({
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? null,
        tokenType: tokenData.token_type ?? "Bearer",
        expiresAt,
        scope: tokenData.scope ?? "openid email profile offline_access",
      }),
    );

    const { data: integration, error: integrationError } = await admin
      .from("user_integrations")
      .upsert(
        {
          user_id: oauthState.user_id,
          provider: "vercel",
          connection_type: "oauth",
          external_account_id: vercelUser.sub,
          display_name:
            vercelUser.preferred_username ??
            vercelUser.name ??
            vercelUser.email ??
            "Vercel",
          credential_reference: "oauth:vercel",
          scopes: (tokenData.scope ?? "")
            .split(" ")
            .map((scope) => scope.trim())
            .filter(Boolean),
          status: "active",
          last_verified_at: now.toISOString(),
          expires_at: expiresAt,
          metadata: {
            connected_at: now.toISOString(),
            email: vercelUser.email ?? null,
            picture: vercelUser.picture ?? null,
          },
          updated_at: now.toISOString(),
        },
        { onConflict: "user_id,provider" },
      )
      .select("id")
      .single();

    if (integrationError || !integration) {
      console.error("Vercel integration record failed", integrationError);
      return redirect("error=storage_failed");
    }

    const { error: credentialError } = await admin
      .from("integration_credentials")
      .upsert(
        {
          integration_id: integration.id,
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          algorithm: "AES-GCM-256",
          key_version: 1,
          rotated_at: now.toISOString(),
        },
        { onConflict: "integration_id" },
      );

    if (credentialError) {
      console.error("Vercel credential storage failed", credentialError);
      await admin
        .from("user_integrations")
        .update({
          status: "error",
          last_verified_at: null,
          updated_at: now.toISOString(),
        })
        .eq("id", integration.id)
        .eq("user_id", oauthState.user_id);
      return redirect("error=credential_storage_failed");
    }

    return redirect("connected=vercel");
  } catch (error) {
    console.error("Vercel callback failed", error);
    return redirect("error=internal");
  }
});
