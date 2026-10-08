import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptIntegrationToken, encryptIntegrationToken } from "./integrationCrypto.ts";

type VercelTokenBundle = {
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  expiresAt: string | null;
  scope: string;
};

export async function getVercelAccessToken(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ token: string; integrationId: string } | null> {
  const { data: integration } = await admin
    .from("user_integrations")
    .select("id,external_account_id,status,expires_at")
    .eq("user_id", userId)
    .eq("provider", "vercel")
    .maybeSingle();

  if (!integration || integration.status !== "active") return null;

  const { data: credential } = await admin
    .from("integration_credentials")
    .select("ciphertext,iv")
    .eq("integration_id", integration.id)
    .maybeSingle();

  if (!credential) return null;

  const raw = await decryptIntegrationToken(credential.ciphertext, credential.iv);
  const bundle = JSON.parse(raw) as VercelTokenBundle;

  if (
    typeof bundle.accessToken === "string" &&
    bundle.accessToken.length > 0 &&
    (!bundle.expiresAt ||
      new Date(bundle.expiresAt).getTime() > Date.now() + 60_000)
  ) {
    return { token: bundle.accessToken, integrationId: integration.id };
  }

  if (!bundle.refreshToken) {
    await admin
      .from("user_integrations")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", integration.id)
      .eq("user_id", userId);
    return null;
  }

  const clientId =
    Deno.env.get("VERCEL_APP_CLIENT_ID") ??
    Deno.env.get("NEXT_PUBLIC_VERCEL_APP_CLIENT_ID") ??
    "";
  const clientSecret = Deno.env.get("VERCEL_APP_CLIENT_SECRET") ?? "";
  if (!clientId) throw new Error("Vercel OAuth client is not configured.");

  const tokenResponse = await fetch(
    "https://api.vercel.com/login/oauth/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        ...(clientSecret ? { client_secret: clientSecret } : {}),
        refresh_token: bundle.refreshToken,
      }),
    },
  );

  const tokenData = (await tokenResponse.json().catch(() => null)) as {
    access_token?: string;
    refresh_token?: string;
    token_type?: string;
    scope?: string;
    expires_in?: number;
  } | null;

  if (!tokenResponse.ok || !tokenData?.access_token) {
    await admin
      .from("user_integrations")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", integration.id)
      .eq("user_id", userId);
    return null;
  }

  const now = new Date();
  const expiresAt =
    typeof tokenData.expires_in === "number"
      ? new Date(now.getTime() + tokenData.expires_in * 1000).toISOString()
      : null;

  const encrypted = await encryptIntegrationToken(
    JSON.stringify({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? bundle.refreshToken,
      tokenType: tokenData.token_type ?? "Bearer",
      expiresAt,
      scope: tokenData.scope ?? bundle.scope,
    } satisfies VercelTokenBundle),
  );

  const { error: updateCredentialError } = await admin
    .from("integration_credentials")
    .update({
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      rotated_at: now.toISOString(),
    })
    .eq("integration_id", integration.id);

  if (updateCredentialError) throw new Error("Failed to persist refreshed Vercel token.");

  await admin
    .from("user_integrations")
    .update({
      status: "active",
      expires_at: expiresAt,
      last_verified_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", integration.id)
    .eq("user_id", userId);

  return { token: tokenData.access_token, integrationId: integration.id };
}
