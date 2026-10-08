import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticate } from "../_shared/auth.ts";
import { corsResponse, optionsResponse } from "../_shared/cors.ts";

function encodeBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/+/g, "-")
    .replace(///g, "_")
    .replace(/=+$/g, "");
}

async function sha256(value: string): Promise<string> {
  return encodeBase64Url(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
}

function randomString(byteLength = 32) {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST") {
    return corsResponse({ error: "Method not allowed" }, 405, request);
  }

  const auth = await authenticate(request);
  if ("error" in auth) return corsResponse({ error: auth.error }, auth.status, request);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const clientId =
    Deno.env.get("VERCEL_APP_CLIENT_ID") ??
    Deno.env.get("NEXT_PUBLIC_VERCEL_APP_CLIENT_ID") ??
    "";

  if (!supabaseUrl || !serviceRoleKey || !clientId) {
    return corsResponse(
      { error: "Vercel OAuth is not configured on the server." },
      503,
      request,
    );
  }

  try {
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const state = randomString(32);
    const stateHash = await sha256(state);
    const nonce = randomString(24);
    const codeVerifier = randomString(48);
    const codeChallenge = encodeBase64Url(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(codeVerifier),
      ),
    );
    const redirectUri = `${supabaseUrl}/functions/v1/vercel-callback`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error } = await admin.from("integration_oauth_states").insert({
      user_id: auth.user.id,
      provider: "vercel",
      state_hash: stateHash,
      redirect_uri: redirectUri,
      expires_at: expiresAt,
      metadata: {
        nonce,
        code_verifier: codeVerifier,
        code_challenge: codeChallenge,
      },
    });

    if (error) {
      console.error("Vercel OAuth state insert failed", error);
      return corsResponse({ error: "Unable to start Vercel connection." }, 500, request);
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile offline_access",
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    return corsResponse(
      {
        provider: "vercel",
        url: `https://vercel.com/oauth/authorize?${params.toString()}`,
        expiresAt,
      },
      200,
      request,
    );
  } catch (error) {
    console.error("Vercel OAuth start failed", error);
    return corsResponse({ error: "Unable to start Vercel connector." }, 500, request);
  }
});
