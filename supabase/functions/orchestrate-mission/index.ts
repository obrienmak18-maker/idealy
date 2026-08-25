import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticate } from "./auth.ts";
import { corsResponse, optionsResponse } from "./cors.ts";

type SquadRequest = {
  idempotencyKey?: unknown;
  missionId?: unknown;
};

type MissionPlan = {
  agents?: unknown[];
  intention?: string;
  nextStep?: string;
  projectKind?: string;
  v1Scope?: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RUN_KEY_PATTERN = /^[a-zA-Z0-9:_-]{16,180}$/;
const PROCESS_FUNCTION = "process-ai-request";

function voiceDirection(way: unknown) {
  const profiles: Record<string, string> = {
    hunter: "Voix d’exploration méthodique : comparer les pistes, expliciter les hypothèses et annoncer le prochain essai vérifiable.",
    mage: "Voix de création structurée : être inventif sans sacrifier les contraintes, les fichiers attendus ou les faits observables.",
    ninja: "Voix tactique : être concis, découper les dépendances et avancer par étapes courtes et contrôlées.",
    professional: "Voix opérationnelle : être calme, précis, centré sur les faits, les risques et le prochain livrable vérifiable.",
  };
  return `${profiles[typeof way === "string" ? way : ""] ?? profiles.professional} Ne pas imiter, citer ou revendiquer l’identité d’un personnage ou d’une franchise existante. Ne jamais annoncer une action, un test, une publication ou un état live non observé.`;
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function summary(value: unknown) {
  const serialized = JSON.stringify(value ?? {});
  return {
    preview: serialized.slice(0, 24_000),
    truncated: serialized.length > 24_000,
  };
}

function isMissionPlan(value: unknown): value is MissionPlan & { agents: unknown[] } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as MissionPlan;
  return Array.isArray(candidate.agents) && candidate.agents.length > 0;
}

function validateWorkspaceStructure(files: Array<{ checksum: string | null; path: string; status: string }>) {
  const expectedPaths = ["package.json", "index.html"];
  const savedPaths = new Set(files.map((file) => file.path));
  const missing = expectedPaths.filter((path) => !savedPaths.has(path));
  const invalid = files
    .filter((file) => !file.checksum || file.status !== "saved" || file.path.startsWith("/") || file.path.includes(".."))
    .map((file) => file.path);
  return {
    checks: { expectedPaths, savedFileCount: files.length },
    invalid,
    missing,
    source: "structural-preflight",
    status: missing.length === 0 && invalid.length === 0 ? "passed" : "needs-fix",
  };
}

async function invokeProcess(input: {
  authorization: string;
  body: Record<string, unknown>;
  supabaseUrl: string;
  anonKey: string;
}) {
  const response = await fetch(`${input.supabaseUrl}/functions/v1/${PROCESS_FUNCTION}`, {
    method: "POST",
    headers: {
      Authorization: input.authorization,
      apikey: input.anonKey,
      "Content-Type": "application/json",
      "x-client-info": "idealy-mission-orchestrator",
    },
    body: JSON.stringify(input.body),
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`AGENT_UPSTREAM_${response.status}:${payload.slice(0, 240)}`);
  }
  if (contentType.includes("text/event-stream")) {
    const stream = await response.text();
    if (stream.includes('"eventType":"mission_error"')) {
      throw new Error("BUILDER_WORKSPACE_FAILED");
    }
    return { stream: true, text: stream.slice(-1000) };
  }
  return (await response.json()) as Record<string, unknown>;
}

async function appendEvent(
  admin: ReturnType<typeof createClient>,
  eventType: string,
  missionId: string,
  idempotencyKey: string,
  payload: Record<string, unknown>,
) {
  const { error } = await admin.rpc("append_mission_file_event", {
    p_event_type: eventType,
    p_file_version: null,
    p_idempotency_key: idempotencyKey,
    p_mission_id: missionId,
    p_path: null,
    p_payload: payload,
  });
  if (error) throw new Error(`EVENT_PERSISTENCE_FAILED:${error.message}`);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST") return corsResponse({ error: "Method not allowed" }, 405, request);

  const auth = await authenticate(request);
  if ("error" in auth) return corsResponse({ error: auth.error }, auth.status, request);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authorization = request.headers.get("Authorization") ?? "";
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization.startsWith("Bearer ")) {
    return corsResponse({ error: "Mission orchestration server configuration is incomplete." }, 500, request);
  }

  const body = (await request.json().catch(() => null)) as SquadRequest | null;
  const missionId = typeof body?.missionId === "string" ? body.missionId : "";
  const runKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";
  if (!UUID_PATTERN.test(missionId) || !RUN_KEY_PATTERN.test(runKey)) {
    return corsResponse({ error: "missionId and an idempotencyKey of 16 to 180 safe characters are required." }, 400, request);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: mission, error: missionError } = await admin
    .from("missions")
    .select("id,title,brief,contracts,dna,status,way")
    .eq("id", missionId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (missionError) return corsResponse({ error: "Unable to read mission." }, 500, request);
  if (!mission) return corsResponse({ error: "Mission not found." }, 404, request);

  const { data: existingRuns, error: existingError } = await admin
    .from("mission_agent_runs")
    .select("id,agent_key,status,output_summary,error_code")
    .eq("mission_id", missionId)
    .eq("run_key", runKey)
    .order("step_index");
  if (existingError) return corsResponse({ error: "Unable to read existing mission run." }, 500, request);
  if (existingRuns?.length) {
    return corsResponse({ missionId, runKey, runs: existingRuns, reused: true }, 200, request);
  }

  const missionContext = JSON.stringify({
    brief: mission.brief ?? {},
    contracts: mission.contracts ?? {},
    dna: mission.dna ?? {},
    title: mission.title,
  }).slice(0, 18_000);
  const missionVoice = voiceDirection(mission.way);
  const inputDigest = await sha256(missionContext);
  const agents = ["architect", "builder", "reviewer"] as const;
  const { error: insertError } = await admin.from("mission_agent_runs").insert(
    agents.map((agentKey, index) => ({
      agent_key: agentKey,
      input_digest: inputDigest,
      mission_id: missionId,
      run_key: runKey,
      step_index: index + 1,
      user_id: auth.user.id,
    })),
  );
  if (insertError) return corsResponse({ error: "Unable to reserve mission run." }, 409, request);

  let activeAgent: (typeof agents)[number] | null = null;
  const updateRun = async (agentKey: (typeof agents)[number], values: Record<string, unknown>) => {
    const { error } = await admin.from("mission_agent_runs")
      .update(values)
      .eq("mission_id", missionId)
      .eq("run_key", runKey)
      .eq("agent_key", agentKey);
    if (error) throw new Error(`RUN_PERSISTENCE_FAILED:${error.message}`);
  };

  try {
    await appendEvent(admin, "mission_started", missionId, `${runKey}:mission:started`, { runKey, source: "orchestrate-mission" });

    activeAgent = "architect";
    await updateRun("architect", { started_at: new Date().toISOString(), status: "running" });
    await appendEvent(admin, "agent_started", missionId, `${runKey}:architect:started`, { agent: "architect", runKey });
    const persistedPlan =
      mission.dna && typeof mission.dna === "object"
        ? (mission.dna as { plan?: unknown }).plan
        : undefined;
    const architect = isMissionPlan(persistedPlan)
      ? { plan: persistedPlan, reusedPersistedPlan: true }
      : await invokeProcess({
          authorization,
          anonKey,
          supabaseUrl,
          body: {
            idempotencyKey: `${runKey}:architect`,
            intentCategory: "IDEATION",
            missionId,
            mode: "auto",
            planOnly: true,
            prompt: `Établis le plan strictement borné de cette mission Idealy. Propose uniquement Architecte, Builder et Reviewer, chacun une seule fois. N’ajoute aucun outil externe, aucune publication et aucune action sur un compte tiers. ${missionVoice} Contexte mission : ${missionContext}`,
          },
        });
    const plan = architect.plan as MissionPlan | undefined;
    if (!isMissionPlan(plan)) throw new Error("ARCHITECT_INVALID_PLAN");
    await updateRun("architect", {
      completed_at: new Date().toISOString(),
      output_summary: summary({ plan, reusedPersistedPlan: architect.reusedPersistedPlan === true }),
      status: "succeeded",
    });
    await appendEvent(admin, "agent_completed", missionId, `${runKey}:architect:completed`, {
      agent: "architect",
      reusedPersistedPlan: architect.reusedPersistedPlan === true,
      runKey,
    });

    await delay(3_200);
    activeAgent = "builder";
    await updateRun("builder", { started_at: new Date().toISOString(), status: "running" });
    await appendEvent(admin, "agent_started", missionId, `${runKey}:builder:started`, { agent: "builder", runKey });
    const builder = await invokeProcess({
      authorization,
      anonKey,
      supabaseUrl,
      body: {
        idempotencyKey: `${runKey}:builder`,
        intentCategory: "EXECUTION",
        missionId,
        mode: "auto",
        prompt: `Construis uniquement la première version conforme au plan suivant. Ne publie rien, n’appelle aucun connecteur et ne crée aucun secret. ${missionVoice} Plan : ${JSON.stringify(plan).slice(0, 12_000)}. Contexte : ${missionContext}`,
        stream: true,
        workspaceStream: true,
      },
    });
    await updateRun("builder", { completed_at: new Date().toISOString(), output_summary: summary({ persistedWorkspace: true, upstream: builder }), status: "succeeded" });
    await appendEvent(admin, "agent_completed", missionId, `${runKey}:builder:completed`, { agent: "builder", runKey });

    await delay(3_200);
    activeAgent = "reviewer";
    await updateRun("reviewer", { started_at: new Date().toISOString(), status: "running" });
    await appendEvent(admin, "agent_started", missionId, `${runKey}:reviewer:started`, { agent: "reviewer", runKey });
    const { data: files, error: filesError } = await admin
      .from("mission_files")
      .select("path,language,checksum,status,version")
      .eq("mission_id", missionId)
      .eq("status", "saved")
      .order("path")
      .limit(500);
    if (filesError) throw new Error(`REVIEWER_FILE_READ_FAILED:${filesError.message}`);
    const validation = validateWorkspaceStructure(files ?? []);
    await appendEvent(admin, "validation_result", missionId, `${runKey}:validation:structural`, validation);
    const { error: validationUpdateError } = await admin
      .from("missions")
      .update({ validation })
      .eq("id", missionId)
      .eq("user_id", auth.user.id);
    if (validationUpdateError) throw new Error(`VALIDATION_PERSISTENCE_FAILED:${validationUpdateError.message}`);
    const reviewer = await invokeProcess({
      authorization,
      anonKey,
      supabaseUrl,
      body: {
        idempotencyKey: `${runKey}:reviewer`,
        intentCategory: "IDEATION",
        missionId,
        mode: "auto",
        prompt: `Agis comme Reviewer. Évalue uniquement les métadonnées de fichiers, le préflight structurel et le plan. Réponds avec un rapport court : état, risques, tests manquants et prochaine action. Ne publie rien et ne modifie aucun fichier. ${missionVoice} Plan : ${JSON.stringify(plan).slice(0, 8_000)}. Préflight : ${JSON.stringify(validation)}. Fichiers : ${JSON.stringify(files ?? []).slice(0, 10_000)}`,
      },
    });
    await updateRun("reviewer", { completed_at: new Date().toISOString(), output_summary: summary(reviewer), status: "succeeded" });
    await appendEvent(admin, "agent_completed", missionId, `${runKey}:reviewer:completed`, { agent: "reviewer", runKey });
    const missionStatus = validation.status === "passed" ? "ready" : "needs-fix";
    await appendEvent(admin, "mission_completed", missionId, `${runKey}:mission:completed`, {
      runKey,
      source: "orchestrate-mission",
      validationStatus: validation.status,
    });
    await admin.from("missions").update({ status: missionStatus }).eq("id", missionId).eq("user_id", auth.user.id);

    const { data: completedRuns } = await admin.from("mission_agent_runs")
      .select("id,agent_key,status,output_summary,error_code,started_at,completed_at")
      .eq("mission_id", missionId)
      .eq("run_key", runKey)
      .order("step_index");
    return corsResponse({ missionId, runKey, runs: completedRuns ?? [], status: missionStatus, validation }, 200, request);
  } catch (error) {
    const code = error instanceof Error ? error.message.slice(0, 180) : "MISSION_RUN_FAILED";
    if (activeAgent) {
      await admin.from("mission_agent_runs")
        .update({ completed_at: new Date().toISOString(), error_code: code, status: "failed" })
        .eq("mission_id", missionId)
        .eq("run_key", runKey)
        .eq("agent_key", activeAgent);
      await appendEvent(admin, "agent_failed", missionId, `${runKey}:${activeAgent}:failed`, { agent: activeAgent, code, runKey }).catch(() => undefined);
    }
    await admin.from("missions").update({ status: "needs-fix" }).eq("id", missionId).eq("user_id", auth.user.id);
    return corsResponse({ error: "Mission squad failed safely.", code }, 502, request);
  }
});
