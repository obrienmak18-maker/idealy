import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_BODY_BYTES = 1_000_000;
const ACCEPTED_EVENTS = new Set([
  "deployment.created",
  "deployment.error",
  "deployment.canceled",
  "deployment.succeeded",
  "deployment.ready",
]);

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function signRawBody(rawBody: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeId(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= 200 ? value : null;
}

Deno.serve(async (request) => {
  if (request.method === "GET") {
    return json({ service: "idealy-vercel-webhook", status: "ready-for-signed-events" });
  }
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const secret = Deno.env.get("VERCEL_APP_CLIENT_SECRET")?.trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!secret || !supabaseUrl || !serviceRoleKey) {
    console.error("vercel-webhook unavailable: required server configuration is missing");
    return json({ error: "webhook_not_configured" }, 503);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return json({ error: "payload_too_large" }, 413);
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) return json({ error: "payload_too_large" }, 413);

  const suppliedSignature = request.headers.get("x-vercel-signature")?.trim().toLowerCase() ?? "";
  if (!/^[a-f0-9]{40}$/.test(suppliedSignature)) return json({ error: "missing_or_invalid_signature" }, 401);
  const expectedSignature = await signRawBody(rawBody, secret);
  if (!constantTimeEqual(suppliedSignature, expectedSignature)) return json({ error: "invalid_signature" }, 401);

  let event: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return json({ error: "invalid_payload" }, 400);
    event = parsed as Record<string, unknown>;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const eventId = safeId(event.id);
  const eventType = safeId(event.type);
  let createdAt: string | null = null;
  if (typeof event.createdAt === "number" && Number.isFinite(event.createdAt)) {
    const date = new Date(event.createdAt);
    if (!Number.isNaN(date.getTime())) createdAt = date.toISOString();
  }
  const payload = event.payload && typeof event.payload === "object" && !Array.isArray(event.payload)
    ? event.payload as Record<string, unknown>
    : null;
  if (!eventId || !eventType || !payload) return json({ error: "missing_event_fields" }, 400);

  if (!ACCEPTED_EVENTS.has(eventType)) {
    return json({ received: true, ignored: true, eventId, eventType });
  }

  const deployment = payload.deployment && typeof payload.deployment === "object"
    ? payload.deployment as Record<string, unknown>
    : {};
  const project = payload.project && typeof payload.project === "object"
    ? payload.project as Record<string, unknown>
    : {};

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await admin.from("vercel_webhook_events").upsert({
    event_id: eventId,
    event_type: eventType,
    event_created_at: createdAt,
    deployment_id: safeId(deployment.id),
    deployment_url: safeId(deployment.url),
    project_id: safeId(project.id ?? payload.projectId),
    project_name: safeId(deployment.name ?? project.name),
    target: safeId(deployment.target ?? payload.target),
    received_at: new Date().toISOString(),
  }, { onConflict: "event_id", ignoreDuplicates: true });

  if (error) {
    console.error("vercel-webhook event persistence failed", { code: error.code });
    return json({ error: "event_persistence_failed" }, 500);
  }
  return json({ received: true, duplicateSafe: true, eventId, eventType });
});
