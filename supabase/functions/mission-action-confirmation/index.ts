import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticate } from "../_shared/auth.ts";
import { corsResponse, optionsResponse } from "../_shared/cors.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const TOKEN_PATTERN = /^[a-zA-Z0-9_-]{32,180}$/;

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (!["POST", "PATCH"].includes(request.method)) return corsResponse({ error: "Method not allowed" }, 405, request);

  const auth = await authenticate(request);
  if ("error" in auth) return corsResponse({ error: auth.error }, auth.status, request);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const missionId = typeof body?.missionId === "string" ? body.missionId : "";
  const confirmationToken = typeof body?.confirmationToken === "string" ? body.confirmationToken : "";
  if (!UUID_PATTERN.test(missionId) || !TOKEN_PATTERN.test(confirmationToken)) {
    return corsResponse({ error: "A mission id and a safe confirmation token are required." }, 400, request);
  }

  if (request.method === "POST") {
    const payloadDigest = typeof body?.payloadDigest === "string" ? body.payloadDigest : "";
    if (!/^[a-f0-9]{64}$/i.test(payloadDigest)) return corsResponse({ error: "A SHA-256 payload digest is required." }, 400, request);
    const { data: mission } = await admin.from("missions").select("id").eq("id", missionId).eq("user_id", auth.user.id).maybeSingle();
    if (!mission) return corsResponse({ error: "Mission not found." }, 404, request);
    const { data: integration } = await admin
      .from("user_integrations")
      .select("id")
      .eq("user_id", auth.user.id)
      .eq("provider", "github")
      .eq("status", "active")
      .maybeSingle();
    if (!integration) return corsResponse({ error: "GitHub not connected." }, 400, request);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { data, error } = await admin.from("mission_action_confirmations").insert({
      confirmation_token_hash: await sha256(confirmationToken),
      expires_at: expiresAt,
      integration_id: integration.id,
      mission_id: missionId,
      operation: "github:export",
      resource_snapshot: { payload_digest: payloadDigest },
      user_id: auth.user.id,
    }).select("id,expires_at,status").single();
    if (error) return corsResponse({ error: "Unable to prepare export confirmation." }, 500, request);
    return corsResponse({ confirmation: data, status: "pending" }, 201, request);
  }

  const { data, error } = await admin
    .from("mission_action_confirmations")
    .update({ approved_at: new Date().toISOString(), status: "approved" })
    .eq("mission_id", missionId)
    .eq("user_id", auth.user.id)
    .eq("operation", "github:export")
    .eq("confirmation_token_hash", await sha256(confirmationToken))
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .select("id,expires_at,status")
    .maybeSingle();
  if (error || !data) return corsResponse({ error: "Confirmation expired or already used." }, 409, request);
  return corsResponse({ confirmation: data, status: "approved" }, 200, request);
});
