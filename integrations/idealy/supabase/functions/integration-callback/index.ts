import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptIntegrationToken } from "../_shared/integrationCrypto.ts";

const APP_ORIGIN =
  Deno.env.get("APP_ORIGIN") ??
  Deno.env.get("APP_URL") ??
  "http://localhost:3000";

function redirect(errorOrQuery: string): Response {
  return Response.redirect(`${APP_ORIGIN.replace(/\/$/, "")}?${errorOrQuery}`);
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/[=]+$/g, "");
}

async function hashState(state: string): Promise<string> {
  return encodeBase64Url(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(state))
  );
}

Deno.serve(async (request) => {
  if (request.method !== "GET") {
    return redirect("error=method_not_allowed");
  }

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) {
      return redirect("error=missing_code_or_state");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const clientId =
      Deno.env.get("GITHUB_OAUTH_CLIENT_ID") ??
      Deno.env.get("GITHUB_CLIENT_ID") ??
      "";
    const clientSecret =
      Deno.env.get("GITHUB_OAUTH_CLIENT_SECRET") ??
      Deno.env.get("GITHUB_CLIENT_SECRET") ??
      "";
    if (!supabaseUrl || !serviceRoleKey || !clientId || !clientSecret) {
      return redirect("error=oauth_server_not_configured");
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const stateHash = await hashState(state);
    const { data: oauthState, error: stateError } = await admin
      .from("integration_oauth_states")
      .select("id, user_id, provider, redirect_uri, expires_at, consumed_at")
      .eq("state_hash", stateHash)
      .eq("provider", "github")
      .maybeSingle();

    if (
      stateError ||
      !oauthState ||
      oauthState.consumed_at ||
      new Date(oauthState.expires_at).getTime() <= Date.now()
    ) {
      return redirect("error=invalid_or_expired_state");
    }

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
      "https://github.com/login/oauth/access_token",
      {
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: oauthState.redirect_uri,
        }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        method: "POST",
      }
    );
    const tokenData = (await tokenResponse.json().catch(() => null)) as {
      access_token?: string;
      token_type?: string;
      scope?: string;
      error?: string;
    } | null;
    if (!tokenResponse.ok || !tokenData?.access_token) {
      console.error(
        "GitHub token exchange failed",
        tokenData?.error ?? tokenResponse.status
      );
      return redirect("error=token_exchange_failed");
    }

    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${tokenData.access_token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    const githubUser = (await userResponse.json().catch(() => null)) as {
      id?: number;
      login?: string;
      name?: string;
    } | null;
    const encrypted = await encryptIntegrationToken(tokenData.access_token);
    const now = new Date().toISOString();

    const { data: integration, error: integrationError } = await admin
      .from("user_integrations")
      .upsert(
        {
          connection_type: "oauth",
          credential_reference: "oauth:github",
          display_name: githubUser?.login ?? githubUser?.name ?? "GitHub",
          external_account_id: githubUser?.id ? String(githubUser.id) : null,
          last_verified_at: now,
          metadata: {
            connected_at: now,
            token_type: tokenData.token_type ?? "bearer",
          },
          provider: "github",
          scopes: (tokenData.scope ?? "")
            .split(",")
            .map((scope) => scope.trim())
            .filter(Boolean),
          status: "active",
          updated_at: now,
          user_id: oauthState.user_id,
        },
        { onConflict: "user_id,provider" }
      )
      .select("id")
      .single();
    if (integrationError || !integration) {
      console.error("GitHub integration record failed", integrationError);
      return redirect("error=storage_failed");
    }

    const { error: credentialError } = await admin
      .from("integration_credentials")
      .upsert(
        {
          algorithm: "AES-GCM-256",
          ciphertext: encrypted.ciphertext,
          integration_id: integration.id,
          iv: encrypted.iv,
          key_version: 1,
          rotated_at: now,
        },
        { onConflict: "integration_id" }
      );
    if (credentialError) {
      console.error("GitHub credential storage failed", credentialError);
      return redirect("error=credential_storage_failed");
    }

    return redirect("connected=github");
  } catch (error) {
    console.error("integration-callback failed", error);
    return redirect("error=internal");
  }
});
