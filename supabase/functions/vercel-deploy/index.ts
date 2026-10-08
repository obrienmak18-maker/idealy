// Security contract: this function uses a user-scoped OAuth integration and never a shared Vercel token.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticate } from "../_shared/auth.ts";
import { corsResponse, optionsResponse } from "../_shared/cors.ts";
import { getVercelAccessToken } from "../_shared/vercelToken.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN = /^[a-zA-Z0-9_-]{32,180}$/;

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha1Bytes(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST") return corsResponse({ error: "Method not allowed" }, 405, request);

  const auth = await authenticate(request);
  if ("error" in auth) return corsResponse({ error: auth.error }, auth.status, request);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return corsResponse({ error: "Vercel deployment is not configured." }, 503, request);
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const missionId = typeof body?.missionId === "string" ? body.missionId : "";
  const confirmationToken =
    typeof body?.confirmationToken === "string" ? body.confirmationToken : "";
  const projectName =
    typeof body?.projectName === "string" && /^[a-z0-9-]{1,100}$/i.test(body.projectName)
      ? body.projectName
      : "";
  const target = body?.target === "production" ? "production" : "preview";

  if (!UUID_PATTERN.test(missionId)) {
    return corsResponse({ error: "A valid missionId is required." }, 400, request);
  }
  if (!projectName) {
    return corsResponse({ error: "A safe Vercel project name is required." }, 400, request);
  }
  if (!TOKEN_PATTERN.test(confirmationToken)) {
    return corsResponse(
      {
        error: "Explicit deployment confirmation is required.",
        code: "CONFIRMATION_REQUIRED",
      },
      409,
      request,
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: mission } = await admin
    .from("missions")
    .select("id,title")
    .eq("id", missionId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!mission) return corsResponse({ error: "Mission not found." }, 404, request);

  const { data: files, error: filesError } = await admin
    .from("mission_files")
    .select("path,content,checksum,status,version")
    .eq("mission_id", missionId)
    .eq("user_id", auth.user.id)
    .eq("status", "saved")
    .order("path")
    .limit(15000);

  if (filesError) return corsResponse({ error: "Unable to read workspace files." }, 500, request);
  if (!files?.length) return corsResponse({ error: "No saved workspace files to deploy." }, 409, request);

  const manifest = files.map((file) => ({
    path: file.path,
    checksum: file.checksum,
    version: file.version,
  }));
  const payloadDigest = await sha256(
    JSON.stringify({ missionId, projectName, target, files: manifest }),
  );

  const { data: confirmation, error: confirmationError } = await admin
    .from("mission_action_confirmations")
    .select("id,resource_snapshot,status,expires_at")
    .eq("mission_id", missionId)
    .eq("user_id", auth.user.id)
    .eq("operation", "vercel:deploy")
    .eq("confirmation_token_hash", await sha256(confirmationToken))
    .eq("status", "approved")
    .gt("expires_at", new Date().toISOString())
    .is("consumed_at", null)
    .maybeSingle();

  if (
    confirmationError ||
    !confirmation ||
    confirmation.resource_snapshot?.payload_digest !== payloadDigest
  ) {
    return corsResponse(
      {
        error: "Deployment confirmation is expired, invalid, or does not match the current workspace.",
        code: "CONFIRMATION_INVALID",
        payloadDigest,
      },
      409,
      request,
    );
  }

  const credentials = await getVercelAccessToken(admin, auth.user.id);
  if (!credentials) {
    return corsResponse(
      { error: "Vercel is not connected or its authorization has expired." },
      401,
      request,
    );
  }

  try {
    const fileRefs: Array<{ file: string; sha: string; size: number }> = [];

    for (const file of files) {
      if (
        typeof file.path !== "string" ||
        file.path.startsWith("/") ||
        file.path.includes("..") ||
        typeof file.content !== "string"
      ) {
        return corsResponse({ error: "Workspace contains an invalid file path or content." }, 422, request);
      }

      const bytes = new TextEncoder().encode(file.content);
      const digest = await sha1Bytes(file.content);

      const upload = await fetch("https://api.vercel.com/v2/files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.token}`,
          "Content-Type": "application/octet-stream",
          "Content-Length": String(bytes.byteLength),
          "x-vercel-digest": digest,
        },
        body: bytes,
      });

      if (!upload.ok && upload.status !== 200) {
        const payload = await upload.text();
        throw new Error(`VERCEL_FILE_UPLOAD_${upload.status}:${payload.slice(0, 240)}`);
      }

      fileRefs.push({
        file: file.path,
        sha: digest,
        size: bytes.byteLength,
      });
    }

    const deploymentResponse = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: projectName,
        files: fileRefs,
        target,
      }),
    });

    const deployment = await deploymentResponse.json().catch(() => null);

    if (!deploymentResponse.ok) {
      throw new Error(
        `VERCEL_DEPLOY_${deploymentResponse.status}:${JSON.stringify(deployment).slice(0, 700)}`,
      );
    }

    const { error: consumedError } = await admin
      .from("mission_action_confirmations")
      .update({
        consumed_at: new Date().toISOString(),
        status: "consumed",
      })
      .eq("id", confirmation.id)
      .eq("user_id", auth.user.id)
      .eq("status", "approved")
      .is("consumed_at", null);

    if (consumedError) {
      console.error("Vercel confirmation could not be consumed", consumedError);
      return corsResponse(
        {
          error:
            "Le déploiement Vercel a été déclenché mais sa confirmation n’a pas pu être consommée. Ne relancez pas automatiquement.",
          code: "CONFIRMATION_CONSUME_FAILED",
        },
        500,
        request,
      );
    }

    await admin
      .from("user_integrations")
      .update({
        status: "active",
        last_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", credentials.integrationId)
      .eq("user_id", auth.user.id);

    return corsResponse(
      {
        status: deployment?.readyState ?? deployment?.state ?? "QUEUED",
        deploymentId: deployment?.id ?? null,
        deploymentUrl: deployment?.url ? `https://${deployment.url}` : null,
        target,
        projectName,
      },
      201,
      request,
    );
  } catch (error) {
    console.error("vercel-deploy failed", error);
    return corsResponse(
      {
        error: error instanceof Error ? error.message.slice(0, 400) : "Vercel deployment failed.",
        code: "VERCEL_DEPLOY_FAILED",
      },
      502,
      request,
    );
  }
});
