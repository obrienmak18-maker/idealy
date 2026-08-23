import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticate } from "../_shared/auth.ts";
import { corsResponse, optionsResponse } from "../_shared/cors.ts";

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function hashState(state: string): Promise<string> {
  return encodeBase64Url(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(state)),
  );
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST")
    return corsResponse({ error: "Method not allowed" }, 405, request);

  const auth = await authenticate(request);
  if ("error" in auth)
    return corsResponse({ error: auth.error }, auth.status, request);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const clientId =
      Deno.env.get("GITHUB_OAUTH_CLIENT_ID") ??
      Deno.env.get("GITHUB_CLIENT_ID") ??
      "";
    if (!supabaseUrl || !serviceRoleKey || !clientId) {
      return corsResponse(
        { error: "GitHub OAuth is not configured on the server." },
        503,
        request,
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const stateBytes = crypto.getRandomValues(new Uint8Array(32));
    const state = encodeBase64Url(stateBytes);
    const stateHash = await hashState(state);
    const redirectUri = `${supabaseUrl}/functions/v1/integration-callback`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertError } = await admin
      .from("integration_oauth_states")
      .insert({
        user_id: auth.user.id,
        provider: "github",
        state_hash: stateHash,
        redirect_uri: redirectUri,
        expires_at: expiresAt,
      });
    if (insertError) {
      console.error("integration-connect state insert failed", insertError);
      return corsResponse(
        { error: "Unable to start GitHub connection." },
        500,
        request,
      );
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "repo user",
      state,
    });

    return corsResponse(
      {
        provider: "github",
        url: `https://github.com/login/oauth/authorize?${params.toString()}`,
        expiresAt,
      },
      200,
      request,
    );
  } catch (error) {
    console.error("integration-connect failed", error);
    return corsResponse(
      { error: "Unable to start connector OAuth." },
      500,
      request,
    );
  }
});
