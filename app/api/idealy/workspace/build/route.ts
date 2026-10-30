import { createClient } from "@supabase/supabase-js";
import { runWorkspaceBuildInSandbox } from "@/lib/idealy/runtime/e2b";

export const runtime = "nodejs";
export const maxDuration = 240;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function appendMissionEvent(
  admin: ReturnType<typeof createClient>,
  input: {
    eventType: "build_log" | "validation_result";
    idempotencyKey: string;
    missionId: string;
    payload: Record<string, unknown>;
  },
) {
  const { error } = await admin.rpc("append_mission_file_event", {
    p_event_type: input.eventType,
    p_file_version: null,
    p_idempotency_key: input.idempotencyKey,
    p_mission_id: input.missionId,
    p_path: null,
    p_payload: input.payload,
  });
  if (error) throw new Error(`MISSION_BUILD_EVENT_FAILED:${error.message}`);
}

async function eventKey(runKey: string, iteration: number, phase: string) {
  const value = `${runKey}:${iteration}:${phase}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  const hash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `workspace-build:${hash}`;
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization")?.trim() ?? "";
    const match = authorization.match(/^Bearer\s+(\S+)$/i);
    if (!match) return json({ error: "Unauthorized." }, 401);

    const supabaseUrl = (
      process.env.SUPABASE_URL ??
      process.env.NEXT_PUBLIC_SUPABASE_URL ??
      ""
    ).replace(/\/+$/, "");
    const anonKey =
      process.env.SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      "";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "Supabase server configuration is incomplete." }, 503);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(match[1]);
    if (authError || !user) return json({ error: "Unauthorized." }, 401);

    const body = (await request.json().catch(() => null)) as {
      iteration?: unknown;
      missionId?: unknown;
      runKey?: unknown;
    } | null;
    const missionId = typeof body?.missionId === "string" ? body.missionId : "";
    const runKey = typeof body?.runKey === "string" ? body.runKey : "";
    const iteration =
      typeof body?.iteration === "number" && Number.isInteger(body.iteration)
        ? body.iteration
        : 1;

    if (
      !UUID_PATTERN.test(missionId) ||
      !/^[a-zA-Z0-9:_-]{16,180}$/.test(runKey) ||
      iteration < 1 ||
      iteration > 3
    ) {
      return json({ error: "Invalid mission build request." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: mission, error: missionError } = await admin
      .from("missions")
      .select("id")
      .eq("id", missionId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (missionError) throw new Error(`MISSION_READ_FAILED:${missionError.message}`);
    if (!mission) return json({ error: "Mission not found." }, 404);

    const { data: files, error: filesError } = await admin
      .from("mission_files")
      .select("path,content")
      .eq("mission_id", missionId)
      .eq("status", "saved")
      .order("path", { ascending: true })
      .limit(250);
    if (filesError) throw new Error(`MISSION_FILES_READ_FAILED:${filesError.message}`);

    await appendMissionEvent(admin, {
      eventType: "build_log",
      idempotencyKey: await eventKey(runKey, iteration, "started"),
      missionId,
      payload: {
        phase: "started",
        message: "E2B sandbox: préparation de la compilation réelle du workspace.",
        iteration,
      },
    });

    const build = await runWorkspaceBuildInSandbox(
      (files ?? []).map((file) => ({
        path: file.path,
        content: file.content ?? "",
      })),
    );

    const lines = [
      ...build.stdout.split(/\r?\n/).map((line) => ({ stream: "stdout", line })),
      ...build.stderr.split(/\r?\n/).map((line) => ({ stream: "stderr", line })),
    ].filter((entry) => entry.line.trim()).slice(-80);

    for (let index = 0; index < lines.length; index += 1) {
      await appendMissionEvent(admin, {
        eventType: "build_log",
        idempotencyKey: await eventKey(runKey, iteration, `line-${index}`),
        missionId,
        payload: {
          phase: "output",
          stream: lines[index].stream,
          message: lines[index].line.slice(0, 1_000),
          iteration,
        },
      });
    }

    await appendMissionEvent(admin, {
      eventType: "validation_result",
      idempotencyKey: await eventKey(runKey, iteration, "result"),
      missionId,
      payload: {
        source: "e2b-npm-build",
        status: build.status,
        durationMs: build.durationMs,
        error: build.error ?? null,
        stdout: build.stdout,
        stderr: build.stderr,
        iteration,
      },
    });

    return json({ build });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Idealy workspace build failed:", message);
    return json({ error: message.slice(0, 1_500) }, 500);
  }
}
