import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticate } from "./auth.ts";
import { corsResponse, optionsResponse } from "./cors.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_FILE_BYTES = 1_000_000;

function normalizePath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const path = value.trim().replaceAll("\\", "/").replace(/^\.\//, "");
  if (
    !path ||
    path.startsWith("/") ||
    path.includes("..") ||
    path.length > 240 ||
    path.includes("\0")
  ) {
    return null;
  }
  return path;
}

function languageFromPath(path: string): string | null {
  const extension = path.split(".").pop()?.toLowerCase();
  const languages: Record<string, string> = {
    css: "css",
    html: "html",
    js: "javascript",
    json: "json",
    md: "markdown",
    scss: "scss",
    ts: "typescript",
    tsx: "tsx",
  };
  return extension ? languages[extension] ?? extension : null;
}

async function checksum(content: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(content),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST") {
    return corsResponse({ error: "Method not allowed" }, 405, request);
  }

  const authentication = await authenticate(request);
  if ("error" in authentication) {
    return corsResponse({ error: authentication.error }, authentication.status, request);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return corsResponse({ error: "La configuration serveur du workspace est incomplète." }, 500, request);
  }

  const contentLength = Number(request.headers.get("Content-Length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_FILE_BYTES + 16_384) {
    return corsResponse({ error: "Le fichier dépasse la limite de 1 Mo." }, 413, request);
  }

  const body = await request.json().catch(() => null) as {
    missionId?: unknown;
    path?: unknown;
    content?: unknown;
    expectedVersion?: unknown;
  } | null;
  const missionId = typeof body?.missionId === "string" ? body.missionId : "";
  const path = normalizePath(body?.path);
  const content = typeof body?.content === "string" ? body.content : null;
  const expectedVersion = body?.expectedVersion;

  if (!UUID_PATTERN.test(missionId) || !path || content === null) {
    return corsResponse({ error: "missionId, path et content valides sont requis." }, 400, request);
  }
  if (new TextEncoder().encode(content).byteLength > MAX_FILE_BYTES) {
    return corsResponse({ error: "Le fichier dépasse la limite de 1 Mo." }, 413, request);
  }
  if (!Number.isSafeInteger(expectedVersion) || Number(expectedVersion) < 1) {
    return corsResponse({ error: "La version de base du fichier est invalide." }, 400, request);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Service-role access is deliberately constrained by an explicit ownership
  // check before any file row can be read or written.
  const { data: mission, error: missionError } = await admin
    .from("missions")
    .select("id,user_id")
    .eq("id", missionId)
    .maybeSingle();

  if (missionError) {
    console.error("Manual file save could not verify mission ownership", missionError);
    return corsResponse({ error: "Impossible de vérifier la propriété de cette mission." }, 500, request);
  }
  if (!mission || mission.user_id !== authentication.user.id) {
    return corsResponse({ error: "Mission introuvable ou accès refusé." }, 404, request);
  }

  const { data: currentFile, error: currentFileError } = await admin
    .from("mission_files")
    .select("id,language,path,status,version")
    .eq("mission_id", missionId)
    .eq("path", path)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (currentFileError) {
    console.error("Manual file save could not read the current version", currentFileError);
    return corsResponse({ error: "Impossible de charger la version actuelle du fichier." }, 500, request);
  }
  if (!currentFile) {
    return corsResponse({ error: "Ce fichier n’existe plus dans le workspace." }, 404, request);
  }
  if (currentFile.version !== expectedVersion) {
    return corsResponse({
      error: "Le fichier a changé depuis son ouverture. Recharge la dernière version avant de réessayer.",
      code: "FILE_VERSION_CONFLICT",
      latestVersion: currentFile.version,
    }, 409, request);
  }
  if (currentFile.status === "writing") {
    return corsResponse({ error: "Ce fichier est encore en cours de génération." }, 409, request);
  }

  const nextVersion = currentFile.version + 1;
  const fileChecksum = await checksum(content);
  const { data: savedFile, error: saveError } = await admin
    .from("mission_files")
    .insert({
      checksum: fileChecksum,
      content,
      language: currentFile.language ?? languageFromPath(path),
      mission_id: missionId,
      path,
      source: "user",
      status: "saved",
      version: nextVersion,
    })
    .select("id,mission_id,path,content,language,version,status,checksum,updated_at")
    .single();

  if (saveError) {
    console.error("Manual file version could not be persisted", saveError);
    return corsResponse({
      error: saveError.code === "23505"
        ? "Une autre modification vient d’être enregistrée. Recharge le fichier et réessaie."
        : "La nouvelle version du fichier n’a pas pu être enregistrée.",
      code: saveError.code === "23505" ? "FILE_VERSION_CONFLICT" : "FILE_SAVE_FAILED",
    }, saveError.code === "23505" ? 409 : 500, request);
  }

  let lastSequence: number | null = null;
  let eventPersisted = false;
  const { data: sequence, error: eventError } = await admin.rpc("append_mission_file_event", {
    p_event_type: "file_saved",
    p_file_version: nextVersion,
    p_idempotency_key: `editor:${crypto.randomUUID()}`,
    p_mission_id: missionId,
    p_path: path,
    p_payload: {
      action: "manual_edit",
      checksum: fileChecksum,
      source: "user",
      previousVersion: currentFile.version,
    },
  });

  if (eventError) {
    // The immutable file version is already stored. Do not report a false save
    // failure; the client refreshes the canonical file list after this response.
    console.error("Manual file save event could not be appended", eventError);
  } else {
    eventPersisted = true;
    lastSequence = Number.isSafeInteger(Number(sequence)) ? Number(sequence) : null;
  }

  return corsResponse({
    eventPersisted,
    file: {
      checksum: savedFile.checksum,
      content: savedFile.content,
      id: savedFile.id,
      language: savedFile.language,
      missionId: savedFile.mission_id,
      path: savedFile.path,
      status: savedFile.status,
      updatedAt: savedFile.updated_at,
      version: savedFile.version,
    },
    lastSequence,
  }, 200, request);
});
