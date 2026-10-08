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

type AgentKey = "chief" | "builder" | "designer" | "specialist" | "reviewer";

type AgentDefinition = {
  key: AgentKey;
  name: string;
  role: string;
};

const MAX_REVIEW_ITERATIONS = 3;
const SQUAD_POWER_POINTS = 50;

const WAY_AGENTS: Record<string, AgentDefinition[]> = {
  ninja: [
    { key: "chief", name: "Minato", role: "Chef de mission et coordination stratégique" },
    { key: "builder", name: "Naruto", role: "Construction full-stack et implémentation" },
    { key: "designer", name: "Sakura", role: "UI/UX, expérience et qualité visuelle" },
    { key: "specialist", name: "Sasuke", role: "Architecture, systèmes et risques techniques" },
    { key: "reviewer", name: "Shikamaru", role: "Tactique, QA et vérification finale" },
  ],
  mage: [
    { key: "chief", name: "Erza", role: "Chef de mission et coordination stratégique" },
    { key: "builder", name: "Natsu", role: "Construction et implémentation" },
    { key: "designer", name: "Lucie", role: "UI/UX et expérience produit" },
    { key: "specialist", name: "Luxus", role: "Performance et robustesse technique" },
    { key: "reviewer", name: "Mirajane", role: "Sécurité, qualité et vérification finale" },
  ],
  hunter: [
    { key: "chief", name: "Netero", role: "Chef de mission et coordination stratégique" },
    { key: "builder", name: "Gon", role: "Construction et implémentation" },
    { key: "designer", name: "Leolio", role: "UI/UX et expérience produit" },
    { key: "specialist", name: "Kurapika", role: "Architecture, risques et conformité technique" },
    { key: "reviewer", name: "Killua", role: "Performance, QA et vérification finale" },
  ],
  professional: [
    { key: "chief", name: "Daniel", role: "Chef de mission et coordination stratégique" },
    { key: "builder", name: "Kevin", role: "Construction senior full-stack" },
    { key: "designer", name: "Leslie", role: "Produit, UI/UX et cohérence d’expérience" },
    { key: "specialist", name: "Bill", role: "Cloud, infrastructure et SRE" },
    { key: "reviewer", name: "Maya", role: "QA, conformité et vérification finale" },
  ],
};

function getWayAgents(way: unknown): AgentDefinition[] {
  const key = typeof way === "string" ? way.toLowerCase() : "";
  return WAY_AGENTS[key] ?? WAY_AGENTS.professional;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RUN_KEY_PATTERN = /^[a-zA-Z0-9:_-]{16,180}$/;
const PROCESS_FUNCTION = "process-ai-request";

function powerDepletionMessage(way: unknown) {
  const resources: Record<string, string> = {
    hunter: "Nen",
    mage: "Mana",
    ninja: "Chakra",
    professional: "Énergie",
  };
  return `Votre ${resources[typeof way === "string" ? way : ""] ?? "Power"} est épuisé.`;
}

function voiceDirection(way: unknown) {
  const profiles: Record<string, string> = {
    hunter: "Voix d’exploration méthodique : comparer les pistes, expliciter les hypothèses et annoncer le prochain essai vérifiable.",
    mage: "Voix de création structurée : être inventif sans sacrifier les contraintes, les fichiers attendus ou les faits observables.",
    ninja: "Voix tactique : être concis, découper les dépendances et avancer par étapes courtes et contrôlées.",
    professional: "Voix opérationnelle : être calme, précis, centré sur les faits, les risques et le prochain livrable vérifiable.",
  };
  return `${profiles[typeof way === "string" ? way : ""] ?? profiles.professional} Ne pas imiter, citer ou revendiquer l’identité d’un personnage ou d’une franchise existante. Ne jamais annoncer une action, un test, une publication ou un état live non observé.`;
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

type ReviewerDiagnostic = {
  evidence: string;
  expectedBehavior: string;
  file: string;
  location: string;
  problem: string;
  severity: "critical" | "warning" | "info";
  suggestedCorrection: string;
};

function parseReviewerDecision(value: unknown): {
  reviewStatus: "PASS" | "FAIL";
  diagnostics: ReviewerDiagnostic[];
} {
  const raw = value && typeof value === "object" && typeof (value as Record<string, unknown>).message === "string"
    ? String((value as Record<string, unknown>).message)
    : "";
  const cleaned = raw
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned) as { reviewStatus?: unknown; diagnostics?: unknown };
    const diagnostics = Array.isArray(parsed.diagnostics)
      ? parsed.diagnostics.filter(
          (item): item is ReviewerDiagnostic =>
            Boolean(
              item &&
                typeof item === "object" &&
                typeof (item as Record<string, unknown>).problem === "string" &&
                typeof (item as Record<string, unknown>).severity === "string",
            ),
        )
      : [];
    return {
      diagnostics,
      reviewStatus: parsed.reviewStatus === "PASS" ? "PASS" : "FAIL",
    };
  } catch {
    return {
      diagnostics: [{
        evidence: raw.slice(0, 2000) || "Réponse Reviewer vide ou non JSON.",
        expectedBehavior: "Le Reviewer doit renvoyer un JSON structuré avec reviewStatus=PASS ou FAIL.",
        file: "",
        location: "",
        problem: "Réponse Reviewer non conforme au contrat de validation.",
        severity: "critical",
        suggestedCorrection: "Relancer l’itération avec un rapport Reviewer JSON strict.",
      }],
      reviewStatus: "FAIL",
    };
  }
}

function validateWorkspaceStructure(files: Array<{ checksum: string | null; path: string; status: string }>) {
  const expectedPaths = ["package.json", "index.html"];
  const savedPaths = new Set(files.map((file) => file.path));
  const missing = expectedPaths.filter((path) => !savedPaths.has(path));
  const invalid = files
    .filter((file) => !file.checksum || file.status !== "saved" || file.path.startsWith("/") || file.path.includes(".."))
    .map((file) => file.path);

  const errors: ReviewerDiagnostic[] = [];

  for (const m of missing) {
    errors.push({
      evidence: `Fichiers enregistrés : ${Array.from(savedPaths).slice(0, 10).join(", ") || "aucun fichier"}`,
      expectedBehavior: `Le fichier ${m} doit être généré à la racine du workspace.`,
      file: m,
      location: "root",
      problem: `Fichier manifeste ou point d'entrée manquant : ${m}`,
      severity: "critical",
      suggestedCorrection: `Générer un fichier ${m} valide et complet pour l'application.`,
    });
  }

  for (const inv of invalid) {
    errors.push({
      evidence: `Chemin : ${inv}`,
      expectedBehavior: "Tous les chemins doivent être relatifs, sans '..' ni préfixe '/'.",
      file: inv,
      location: inv,
      problem: `Fichier avec chemin non sécurisé ou intégrité corrompue : ${inv}`,
      severity: "critical",
      suggestedCorrection: "Nettoyer le nom du fichier et recalculer le checksum sha256.",
    });
  }

  const isPassing = missing.length === 0 && invalid.length === 0 && files.length > 0;

  return {
    checks: { expectedPaths, savedFileCount: files.length },
    errors,
    files: files.map((file) => ({ path: file.path, status: file.status })),
    invalid,
    missing,
    source: "structural-preflight",
    status: isPassing ? ("passed" as const) : ("needs-fix" as const),
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
    .select("id,agent_key,agent_name,agent_role,status,output_summary,error_code")
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
  const wayAgents = getWayAgents(mission.way);
  const { error: insertError } = await admin.from("mission_agent_runs").insert(
    wayAgents.map((agent, index) => ({
      agent_key: agent.key,
      agent_name: agent.name,
      agent_role: agent.role,
      input_digest: inputDigest,
      mission_id: missionId,
      run_key: runKey,
      step_index: index + 1,
      user_id: auth.user.id,
    })),
  );
  if (insertError) return corsResponse({ error: "Unable to reserve mission run." }, 409, request);

  const squadPowerPoints = 50;
  const powerReservationKey = `${runKey}:power:mission_squad:reserve`;
  const { data: powerReservation, error: powerReservationError } = await admin.rpc("reserve_power_points", {
    p_user_id: auth.user.id,
    p_operation: "mission_squad",
    p_reserved_points: squadPowerPoints,
    p_idempotency_key: powerReservationKey,
    p_mission_id: missionId,
    p_metadata: { actionType: "mission_squad", source: "orchestrate-mission", runKey },
  });
  if (powerReservationError) {
    await admin.from("mission_agent_runs").delete().eq("mission_id", missionId).eq("run_key", runKey);
    if (powerReservationError.message.includes("Insufficient Power")) {
      return corsResponse({
        error: powerDepletionMessage(mission.way),
        code: "POWER_DEPLETED",
      }, 402, request);
    }
    console.error("Power reservation failed before mission squad", powerReservationError);
    return corsResponse({ error: "La puissance Idealy est momentanément indisponible." }, 503, request);
  }

  const rawReservation = Array.isArray(powerReservation) ? powerReservation[0] : powerReservation;
  const reservation = rawReservation && typeof rawReservation === "object"
    ? (rawReservation as Record<string, unknown>)
    : {};
  const reservationId = typeof reservation.reservation_id === "string" ? reservation.reservation_id : null;
  if (!reservationId) {
    await admin.rpc("release_power_reservation", {
      p_idempotency_key: powerReservationKey,
      p_reason: "missing_reservation_id",
    }).catch(() => undefined);
    await admin.from("mission_agent_runs").delete().eq("mission_id", missionId).eq("run_key", runKey);
    return corsResponse({ error: "La réservation Power n’a pas pu être confirmée." }, 503, request);
  }

  await appendEvent(admin, "power_reserved", missionId, `${runKey}:power:reserved`, {
    actionType: "mission_squad",
    amountReserved: squadPowerPoints,
    reservationId,
    runKey,
    source: "orchestrate-mission",
  });

  let powerReservationHeld = true;
  let activeAgent: AgentDefinition | null = null;
  const updateRun = async (
    agentKey: AgentKey,
    values: Record<string, unknown>,
  ) => {
    const { error } = await admin.from("mission_agent_runs")
      .update(values)
      .eq("mission_id", missionId)
      .eq("run_key", runKey)
      .eq("agent_key", agentKey);
    if (error) throw new Error(`RUN_PERSISTENCE_FAILED:${error.message}`);
  };

  const runAgent = async (
    agent: AgentDefinition,
    iteration: number,
    prompt: string,
    options?: { workspaceStream?: boolean; planOnly?: boolean },
  ) => {
    activeAgent = agent;
    const idempotencyKey =
      iteration === 1
        ? `${runKey}:${agent.key}`
        : `${runKey}:${agent.key}:iteration-${iteration}`;

    await updateRun(agent.key, {
      started_at: new Date().toISOString(),
      status: "running",
    });

    await appendEvent(admin, "agent_started", missionId, `${idempotencyKey}:started`, {
      agent: agent.key,
      agentName: agent.name,
      agentRole: agent.role,
      iteration,
      maxIterations: MAX_REVIEW_ITERATIONS,
      runKey,
    });

    const result = await invokeProcess({
      authorization,
      anonKey,
      supabaseUrl,
      body: {
        idempotencyKey,
        intentCategory: options?.planOnly ? "IDEATION" : "EXECUTION",
        iteration,
        missionId,
        mode: "auto",
        planOnly: options?.planOnly === true,
        prompt,
        stream: options?.workspaceStream === true,
        workspaceStream: options?.workspaceStream === true,
        squadRun: true,
      },
    });

    await updateRun(agent.key, {
      completed_at: new Date().toISOString(),
      output_summary: summary({
        agent: agent.name,
        role: agent.role,
        iteration,
        upstream: result,
      }),
      status: "succeeded",
    });

    await appendEvent(admin, "agent_completed", missionId, `${idempotencyKey}:completed`, {
      agent: agent.key,
      agentName: agent.name,
      agentRole: agent.role,
      iteration,
      runKey,
    });

    return result;
  };

  try {
    await appendEvent(admin, "mission_started", missionId, `${runKey}:mission:started`, {
      runKey,
      source: "orchestrate-mission",
      way: mission.way,
      agentTeam: wayAgents,
    });

    const chief = wayAgents.find((agent) => agent.key === "chief")!;
    const builder = wayAgents.find((agent) => agent.key === "builder")!;
    const designer = wayAgents.find((agent) => agent.key === "designer")!;
    const specialist = wayAgents.find((agent) => agent.key === "specialist")!;
    const reviewer = wayAgents.find((agent) => agent.key === "reviewer")!;

    const missionVoice = voiceDirection(mission.way);
    const persistedPlan =
      mission.dna && typeof mission.dna === "object"
        ? (mission.dna as { plan?: unknown }).plan
        : undefined;

    const chiefResult = await runAgent(
      chief,
      1,
      `Agis comme ${chief.name}, chef de mission de la Way active. Tu es le coordinateur réel de cette mission Idealy. Cadre l’objectif, les hypothèses, les dépendances et les critères de réussite. Prépare un plan exploitable par les quatre autres agents : ${builder.name} (construction), ${designer.name} (UI/UX), ${specialist.name} (architecture/risques) et ${reviewer.name} (QA/finalisation). Le plan doit rester strictement dans le périmètre de la mission et ne doit déclencher aucun connecteur, aucune publication ni aucune action sur un compte tiers. ${missionVoice} ${persistedPlan ? `Plan précédemment enregistré à utiliser comme contexte, pas comme vérité : ${JSON.stringify(persistedPlan).slice(0, 8000)}` : ""} Contexte mission : ${missionContext}`,
      { planOnly: true },
    );

    const plan = chiefResult.plan as MissionPlan | undefined;
    if (!isMissionPlan(plan)) throw new Error("CHIEF_INVALID_PLAN");

    let iteration = 1;
    let currentValidation: ReturnType<typeof validateWorkspaceStructure> | null = null;
    let designerReport: Record<string, unknown> | null = null;
    let specialistReport: Record<string, unknown> | null = null;
    let lastReviewerReport: Record<string, unknown> | null = null;
    let reviewerDecision: ReturnType<typeof parseReviewerDecision> = { diagnostics: [], reviewStatus: "FAIL" };

    // The five Way agents form the real execution team. The chief creates the
    // mission plan first; the designer and specialist are independent planning
    // nodes and can run concurrently; the builder consumes both plans; the
    // reviewer closes the loop. This is the live runtime's first safe DAG edge.
    [designerReport, specialistReport] = await Promise.all([
      runAgent(
        designer,
        1,
        `Agis comme ${designer.name}, spécialiste ${designer.role}. Tu es le responsable UI/UX de préparation de mission. À partir du plan du chef, définis les contraintes d'expérience, de structure d'écran, de cohérence visuelle et d'accessibilité que le builder doit respecter. Ne modifie aucun fichier et n'appelle aucun connecteur. Signale uniquement des exigences vérifiables et produis un rapport structuré. ${missionVoice} Plan : ${JSON.stringify(plan).slice(0, 10_000)}. Contexte : ${missionContext}`,
        { planOnly: true },
      ),
      runAgent(
        specialist,
        1,
        `Agis comme ${specialist.name}, spécialiste ${specialist.role}. Tu es le responsable architecture et risques de préparation de mission. À partir du plan du chef, définis les contraintes d'architecture, de sécurité, de dépendances, de performance et de régression que le builder doit respecter. Ne modifie aucun fichier et n'appelle aucun connecteur. Signale uniquement des exigences vérifiables et produis un rapport structuré. ${missionVoice} Plan : ${JSON.stringify(plan).slice(0, 10_000)}. Contexte : ${missionContext}`,
        { planOnly: true },
      ),
    ]);

    while (iteration <= MAX_REVIEW_ITERATIONS) {
      const correctionInputs = [...(currentValidation?.errors ?? []), ...(reviewerDecision.diagnostics ?? [])].slice(0, 8);
      const diagnosticGuidance =
        correctionInputs.length > 0
          ? `\\nDIAGNOSTICS DE VALIDATION (Itération précédente) :\\n${JSON.stringify(correctionInputs)}\\nCorrige impérativement ces problèmes sans introduire de régression.`
          : "";

      await runAgent(
        builder,
        iteration,
        `Agis comme ${builder.name}, builder réel de la Way active. Construis uniquement le livrable borné et rends les fichiers vérifiables. ${iteration > 1 ? `Applique la correction ciblée (itération ${iteration}/${MAX_REVIEW_ITERATIONS}).` : "Construis la première version."} Ne publie rien, n’appelle aucun connecteur et ne crée aucun secret. ${missionVoice} Plan du chef : ${JSON.stringify(plan).slice(0, 12_000)}. Préparation UI/UX de ${designer.name} : ${JSON.stringify(designerReport).slice(0, 8_000)}. Préparation technique de ${specialist.name} : ${JSON.stringify(specialistReport).slice(0, 8_000)}. Contexte : ${missionContext}${diagnosticGuidance}`,
        { workspaceStream: true },
      );

      const { data: files, error: filesError } = await admin
        .from("mission_files")
        .select("path,language,checksum,status,version")
        .eq("mission_id", missionId)
        .eq("status", "saved")
        .order("path")
        .limit(500);

      if (filesError) throw new Error(`DESIGN_REVIEW_FILE_READ_FAILED:${filesError.message}`);

      currentValidation = validateWorkspaceStructure(files ?? []);
      const enrichedValidation = {
        ...currentValidation,
        iteration,
        maxIterations: MAX_REVIEW_ITERATIONS,
      };

      await appendEvent(
        admin,
        "validation_result",
        missionId,
        `${runKey}:validation:structural:${iteration}`,
        enrichedValidation,
      );

      const { error: validationUpdateError } = await admin
        .from("missions")
        .update({ validation: enrichedValidation })
        .eq("id", missionId)
        .eq("user_id", auth.user.id);

      if (validationUpdateError) throw new Error(`VALIDATION_PERSISTENCE_FAILED:${validationUpdateError.message}`);

      lastReviewerReport = await runAgent(
        reviewer,
        iteration,
        `Agis comme ${reviewer.name}, agent de ${reviewer.role}. Tu es la dernière vérification réelle. Ne modifie aucun fichier. Contrôle les faits, les risques, la conformité au plan, le préflight structurel et les rapports de préparation des autres agents. ${missionVoice} Réponds UNIQUEMENT avec un JSON valide de la forme {"reviewStatus":"PASS"|"FAIL","diagnostics":[{"evidence":"...","expectedBehavior":"...","file":"...","location":"...","problem":"...","severity":"critical|warning|info","suggestedCorrection":"..."}]}. Utilise PASS uniquement si tu as des preuves suffisantes et aucun blocage critique. Plan : ${JSON.stringify(plan).slice(0, 8_000)}. Préparation UI/UX : ${JSON.stringify(designerReport).slice(0, 8_000)}. Préparation technique : ${JSON.stringify(specialistReport).slice(0, 8_000)}. Préflight : ${JSON.stringify(enrichedValidation)}. Fichiers : ${JSON.stringify(files ?? []).slice(0, 10_000)}`,
      );

      reviewerDecision = parseReviewerDecision(lastReviewerReport);
      const reviewerPassed =
        reviewerDecision.reviewStatus === "PASS" &&
        reviewerDecision.diagnostics.every(
          (diagnostic) => diagnostic.severity !== "critical",
        );

      if (currentValidation.status === "passed" && reviewerPassed) break;

      iteration++;
      if (iteration <= MAX_REVIEW_ITERATIONS) {
        await appendEvent(
          admin,
          "auto_correction_started",
          missionId,
          `${runKey}:correction:${iteration}`,
          {
            attempt: iteration,
            errors: currentValidation.errors,
            maxAttempts: MAX_REVIEW_ITERATIONS,
            runKey,
            correctionOwner: builder.name,
            supportingAgents: [designer.name, specialist.name],
          },
        );
      }
    }

    const structuralPassed = currentValidation?.status === "passed";
    const reviewerPassed =
      reviewerDecision.reviewStatus === "PASS" &&
      reviewerDecision.diagnostics.every(
        (diagnostic) => diagnostic.severity !== "critical",
      );
    const isPassed = structuralPassed && reviewerPassed;
    const finalValidationStatus = isPassed ? "passed" : "needs-user-input";
    const missionStatus = isPassed ? "ready" : "needs-fix";

    const finalValidationPayload = {
      ...(currentValidation ?? {
        checks: { expectedPaths: ["package.json", "index.html"], savedFileCount: 0 },
        errors: [],
        files: [],
        invalid: [],
        missing: ["package.json", "index.html"],
        source: "structural-preflight" as const,
      }),
      diagnosticReport: lastReviewerReport,
      reviewerDecision,
      iteration: Math.min(iteration, MAX_REVIEW_ITERATIONS),
      maxIterations: MAX_REVIEW_ITERATIONS,
      status: finalValidationStatus,
    };

    await admin.from("missions").update({
      status: missionStatus,
      validation: finalValidationPayload,
    }).eq("id", missionId).eq("user_id", auth.user.id);

    const { data: settledPower, error: settlePowerError } = await admin.rpc("settle_power_reservation", {
      p_idempotency_key: powerReservationKey,
      p_actual_points: squadPowerPoints,
    });
    if (settlePowerError) {
      throw new Error(`POWER_SETTLEMENT_FAILED:${settlePowerError.message}`);
    }
    powerReservationHeld = false;
    const rawSettlement = Array.isArray(settledPower) ? settledPower[0] : settledPower;
    const settlement = rawSettlement && typeof rawSettlement === "object"
      ? (rawSettlement as Record<string, unknown>)
      : {};
    await appendEvent(admin, "power_consumed", missionId, `${runKey}:power:consumed`, {
      actionType: "mission_squad",
      amountCharged: typeof settlement.charged_points === "number" ? settlement.charged_points : squadPowerPoints,
      powerReleased: typeof settlement.released_points === "number" ? settlement.released_points : 0,
      powerRemaining: typeof settlement.balance === "number" ? settlement.balance : null,
      reservationId,
      runKey,
      source: "orchestrate-mission",
    });

    await appendEvent(admin, "mission_completed", missionId, `${runKey}:mission:completed`, {
      finalStatus: missionStatus,
      iterationsExecuted: Math.min(iteration, MAX_REVIEW_ITERATIONS),
      runKey,
      source: "orchestrate-mission",
      validationStatus: finalValidationStatus,
    });

    const { data: completedRuns } = await admin.from("mission_agent_runs")
      .select("id,agent_key,agent_name,agent_role,status,output_summary,error_code,started_at,completed_at")
      .eq("mission_id", missionId)
      .eq("run_key", runKey)
      .order("step_index");
    return corsResponse({
      missionId,
      runKey,
      runs: completedRuns ?? [],
      status: missionStatus,
      validation: finalValidationPayload,
    }, 200, request);
  } catch (error) {
    if (powerReservationHeld) {
      await admin.rpc("release_power_reservation", {
        p_idempotency_key: powerReservationKey,
        p_reason: error instanceof Error ? error.message.slice(0, 180) : "MISSION_RUN_FAILED",
      }).catch((releaseError) => {
        console.error("Power reservation release failed", releaseError);
      });
    }
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
