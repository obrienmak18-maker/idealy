import { getSafeToken } from "@/lib/auth/session-token";
import { isDevelopmentEnvironment } from "@/lib/constants";
import {
  getMissionPersona,
  type MissionWay,
  missionPersonaPrompt,
  normalizeMissionWay,
} from "./agent-personas";
import { getIdealyAiFunctionUrl } from "./config";
import {
  buildDesignSpecification,
  type DesignSpecification,
  designSpecificationToPrompt,
  runDesignCritic,
} from "./design-engine";
import { type OnboardingInput, type OnboardingStatus } from "./onboarding-contract";
import { type IdealyWay, isIdealyWay } from "./product-contract";
import { getUserById } from "@/lib/db/queries";
import { signInFirebaseUserThroughSupabase } from "./supabase-auth";
import { normalizeMissionFilePath } from "./mission-files";

export type IdealyIntentCategory = "CONVERSATION" | "IDEATION" | "EXECUTION";

export type MissionPlanAgent = {
  name: string;
  responsibility: string;
  result: string;
};

export type MissionPlan = {
  projectKind: string;
  intention: string;
  v1Scope: string;
  agents: MissionPlanAgent[];
  nextStep: string;
  design: DesignSpecification;
  designCritic: import("./design-engine").DesignCriticResult;
};

export type IdealyMission = {
  id: string;
  status: string | null;
};

export type IdealyMissionFileEvent = {
  created_at: string;
  event_type: string;
  file_version: number | null;
  id: string;
  mission_id: string;
  path: string | null;
  payload: Record<string, unknown>;
  sequence: number;
};

export type IdealyMissionFile = {
  checksum: string | null;
  content: string;
  id: string;
  language: string | null;
  mission_id: string;
  path: string;
  status: "pending" | "writing" | "saved" | "validated" | "error";
  updated_at: string;
  version: number;
};

export type IdealyMissionDatabaseRecord = {
  created_at: string | null;
  dna: unknown;
  id: string;
  status: string | null;
  title: string | null;
  validation: unknown;
  way: string | null;
};

export type IdealyMissionAgentRun = {
  agent_key: string;
  completed_at: string | null;
  id: string;
  mission_id: string;
  run_key: string;
  started_at: string | null;
  status: string;
  step_index: number;
};

export type IdealyMissionCheckpoint = {
  checksum?: string;
  createdAt: string;
  description?: string;
  fileCount: number;
  files: Array<{
    checksum?: string;
    content: string;
    language?: string;
    path: string;
    status: "pending" | "writing" | "saved" | "validated" | "error";
    version: number;
  }>;
  id: string;
  missionId: string;
  name: string;
};

type IdealyIntentResponse = {
  intent?: unknown;
};

type IdealyPlanResponse = {
  plan?: unknown;
};

type IdealyMissionResponse = {
  id?: unknown;
  status?: unknown;
};

type IdealyProfileResponse = {
  experience_level?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  id?: unknown;
  onboarding_completed?: unknown;
  primary_goal?: unknown;
  project_type?: unknown;
  way?: unknown;
};

type IdealyOnboardingResponse = {
  display_name?: unknown;
  id?: unknown;
  onboarding_completed?: unknown;
  way?: unknown;
};

const MISSION_PLAN_SYSTEM_PROMPT =
  "You are the Idealy mission planner. Return only valid JSON, with no markdown fences and no extra text. The JSON must contain exactly these useful fields: projectKind (string), intention (string), v1Scope (string), agents (array of 1 to 8 objects with name, responsibility, result strings), and nextStep (string). Keep the first version practical and explain what each specialized agent will deliver. The Design Engine specification appended to this prompt is authoritative for visual strategy; do not silently override explicit user technology choices.";

function isIntentCategory(value: unknown): value is IdealyIntentCategory {
  return (
    value === "CONVERSATION" || value === "IDEATION" || value === "EXECUTION"
  );
}

function parseMissionPlan(
  value: unknown
): Omit<MissionPlan, "design" | "designCritic"> {
  if (!value || typeof value !== "object") {
    throw new Error("Le backend Idealy n’a pas renvoyé de plan de mission.");
  }

  const candidate = value as Partial<MissionPlan>;
  const agents = Array.isArray(candidate.agents)
    ? candidate.agents
        .filter((agent): agent is MissionPlanAgent =>
          Boolean(agent && typeof agent === "object")
        )
        .map((agent) => ({
          name: typeof agent.name === "string" ? agent.name.trim() : "",
          responsibility:
            typeof agent.responsibility === "string"
              ? agent.responsibility.trim()
              : "",
          result: typeof agent.result === "string" ? agent.result.trim() : "",
        }))
        .filter((agent) => agent.name && agent.responsibility && agent.result)
        .slice(0, 8)
    : [];

  const text = (input: unknown, fallback: string) =>
    typeof input === "string" && input.trim() ? input.trim() : fallback;

  if (!agents.length) {
    throw new Error("Le backend Idealy a renvoyé un plan sans agents valides.");
  }

  return {
    agents,
    intention: text(candidate.intention, "Clarifier le résultat attendu"),
    nextStep: text(candidate.nextStep, "Valider le plan avant la construction"),
    projectKind: text(candidate.projectKind, "Application à préciser"),
    v1Scope: text(candidate.v1Scope, "Premier parcours utilisable"),
  };
}

export type SupabaseServerContextOverride = {
  accessToken?: string | null;
  userId?: string | null;
};

async function getSupabaseServerContext(
  request: Request,
  override?: SupabaseServerContextOverride
) {
  let token = null;
  try {
    token = await getSafeToken(request);
  } catch {
    // Graceful token extraction fallback
  }

  const url = (
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    ""
  ).replace(/\/+$/, "");
  const anonKey =
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  let accessToken =
    override?.accessToken?.trim() ||
    (typeof token?.supabaseAccessToken === "string"
      ? token.supabaseAccessToken.trim()
      : null);
  let userId =
    override?.userId?.trim() ||
    (typeof token?.supabaseUserId === "string"
      ? token.supabaseUserId.trim()
      : null);

  if ((!accessToken || !userId) && token) {
    let email =
      typeof token.email === "string" && token.email.trim()
        ? token.email.trim().toLowerCase()
        : null;
    if (!email && token.id) {
      const localUser = await getUserById(token.id).catch(() => null);
      if (localUser?.email) {
        email = localUser.email.trim().toLowerCase();
      }
    }
    if (
      email &&
      !email.endsWith("@idealy.local") &&
      !email.startsWith("guest-")
    ) {
      try {
        const bridge = await signInFirebaseUserThroughSupabase(email);
        if (
          bridge.status === "authenticated" &&
          bridge.accessToken &&
          bridge.userId
        ) {
          accessToken = bridge.accessToken;
          userId = bridge.userId;
        }
      } catch (err) {
        console.error("Auto-bridge failed in getSupabaseServerContext:", err);
      }
    }
  }

  if (!accessToken || !userId || !url || !anonKey) {
    throw new Error(
      "La configuration serveur et la session Idealy sont requises pour cette opération."
    );
  }

  return { accessToken, anonKey, url, userId };
}

async function callProcessAIRequest<T>(
  request: Request,
  body: Record<string, unknown>
): Promise<T> {
  const { accessToken, anonKey } = await getSupabaseServerContext(request);
  const response = await fetch(getIdealyAiFunctionUrl(), {
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
      "Content-Type": "application/json",
      "x-client-info": "idealy-next-workspace",
    },
    method: "POST",
  });

  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;

  if (!response.ok) {
    throw new Error(
      payload && typeof payload.error === "string"
        ? payload.error
        : `Le backend Idealy a répondu ${response.status}.`
    );
  }

  if (!payload) {
    throw new Error("Le backend Idealy a renvoyé une réponse vide.");
  }

  return payload;
}

async function callSupabaseRest<T>(
  request: Request,
  path: string,
  init: RequestInit,
  override?: SupabaseServerContextOverride
): Promise<T> {
  const { accessToken, anonKey, url } = await getSupabaseServerContext(request, override);
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const payload = (await response.json().catch(() => null)) as
    | (T & { message?: string; hint?: string })
    | null;

  if (!response.ok) {
    const detail =
      payload && typeof payload.message === "string"
        ? payload.message
        : `Supabase a répondu ${response.status}.`;
    throw new Error(detail);
  }

  return payload as T;
}

export async function getMyIdealyOnboardingStatus({
  request,
  contextOverride,
}: {
  request: Request;
  contextOverride?: SupabaseServerContextOverride;
}): Promise<OnboardingStatus> {
  const { userId } = await getSupabaseServerContext(request, contextOverride);
  const profiles = await callSupabaseRest<IdealyProfileResponse[]>(
    request,
    `profiles?select=id,first_name,last_name,way,onboarding_completed,experience_level,primary_goal,project_type&id=eq.${encodeURIComponent(userId)}&limit=1`,
    { cache: "no-store", method: "GET" },
    contextOverride
  );
  const profile = Array.isArray(profiles) ? profiles[0] : null;

  return {
    experienceLevel:
      profile && typeof profile.experience_level === "string"
        ? profile.experience_level
        : null,
    firstName:
      profile && typeof profile.first_name === "string"
        ? profile.first_name
        : null,
    lastName:
      profile && typeof profile.last_name === "string"
        ? profile.last_name
        : null,
    onboardingCompleted: profile?.onboarding_completed === true,
    primaryGoal:
      profile && typeof profile.primary_goal === "string"
        ? profile.primary_goal
        : null,
    profileExists: Boolean(profile && typeof profile.id === "string"),
    projectType:
      profile && typeof profile.project_type === "string"
        ? profile.project_type
        : null,
    way: isIdealyWay(profile?.way) ? profile.way : null,
  };
}

export async function completeMyIdealyOnboarding({
  input,
  request,
  contextOverride,
}: {
  input: OnboardingInput;
  request: Request;
  contextOverride?: SupabaseServerContextOverride;
}): Promise<{
  displayName: string | null;
  onboardingCompleted: boolean;
  way: IdealyWay;
}> {
  const records = await callSupabaseRest<IdealyOnboardingResponse[]>(
    request,
    "rpc/complete_my_onboarding",
    {
      body: JSON.stringify({
        p_discovery_source: input.discoverySource ?? "",
        p_experience_level: input.experienceLevel,
        p_first_name: input.firstName,
        p_last_name: input.lastName,
        p_preferred_language: input.preferredLanguage,
        p_primary_goal: input.primaryGoal,
        p_project_type: input.projectType,
        p_timezone: input.timezone,
        p_way: input.way,
      }),
      method: "POST",
    },
    contextOverride
  );
  const profile = Array.isArray(records) ? records[0] : null;

  if (
    !profile ||
    profile.onboarding_completed !== true ||
    !isIdealyWay(profile.way)
  ) {
    throw new Error("La finalisation du profil Idealy a échoué.");
  }

  return {
    displayName:
      typeof profile.display_name === "string" ? profile.display_name : null,
    onboardingCompleted: true,
    way: profile.way,
  };
}

export async function listIdealyMissionFileEvents({
  afterSequence,
  missionId,
  request,
}: {
  afterSequence: number;
  missionId: string;
  request: Request;
}): Promise<IdealyMissionFileEvent[]> {
  const events = await callSupabaseRest<IdealyMissionFileEvent[]>(
    request,
    `mission_file_events?select=id,mission_id,sequence,event_type,path,file_version,payload,created_at&mission_id=eq.${encodeURIComponent(missionId)}&sequence=gt.${afterSequence}&order=sequence.asc&limit=100`,
    {
      cache: "no-store",
      method: "GET",
    }
  );

  return Array.isArray(events) ? events : [];
}

export async function listIdealyMissionFiles({
  missionId,
  request,
}: {
  missionId: string;
  request: Request;
}): Promise<IdealyMissionFile[]> {
  const files = await callSupabaseRest<IdealyMissionFile[]>(
    request,
    `mission_files?select=id,mission_id,path,content,language,version,status,checksum,updated_at&mission_id=eq.${encodeURIComponent(missionId)}&order=path.asc,version.desc&limit=500`,
    {
      cache: "no-store",
      method: "GET",
    }
  );

  return Array.isArray(files) ? files : [];
}

export async function saveIdealyMissionFile({
  content,
  expectedVersion,
  missionId,
  path,
  request,
}: {
  content: string;
  expectedVersion: number;
  missionId: string;
  path: string;
  request: Request;
}): Promise<{
  eventPersisted: boolean;
  file: {
    checksum: string | null;
    content: string;
    id: string;
    language: string | null;
    missionId: string;
    path: string;
    status: "saved";
    updatedAt: string;
    version: number;
  };
  lastSequence: number | null;
}> {
  const normalizedPath = normalizeMissionFilePath(path);
  if (new TextEncoder().encode(content).byteLength > 1_000_000) {
    throw Object.assign(new Error("Le fichier dépasse la limite de 1 Mo."), { status: 413 });
  }

  const { accessToken, anonKey, url } = await getSupabaseServerContext(request);
  const response = await fetch(`${url}/functions/v1/save-mission-file`, {
    body: JSON.stringify({
      content,
      expectedVersion,
      missionId,
      path: normalizedPath,
    }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
      "Content-Type": "application/json",
      "x-client-info": "idealy-workspace-editor",
    },
    method: "POST",
  });
  const payload = (await response.json().catch(() => null)) as
    | {
        error?: string;
        code?: string;
        eventPersisted?: boolean;
        file?: {
          checksum: string | null;
          content: string;
          id: string;
          language: string | null;
          missionId: string;
          path: string;
          status: "saved";
          updatedAt: string;
          version: number;
        };
        lastSequence?: number | null;
      }
    | null;

  if (!response.ok) {
    const error = new Error(
      payload && typeof payload.error === "string"
        ? payload.error
        : `Le service de fichiers a répondu ${response.status}.`,
    ) as Error & { status?: number; code?: string };
    error.status = response.status;
    error.code = payload?.code;
    throw error;
  }
  if (!payload?.file || typeof payload.file.content !== "string") {
    throw new Error("Le service de fichiers n’a pas confirmé l’enregistrement.");
  }

  return {
    eventPersisted: payload.eventPersisted === true,
    file: payload.file,
    lastSequence:
      typeof payload.lastSequence === "number" ? payload.lastSequence : null,
  };
}

export async function getIdealyMissionDatabaseRecord({
  missionId,
  request,
}: {
  missionId: string;
  request: Request;
}): Promise<IdealyMissionDatabaseRecord | null> {
  const records = await callSupabaseRest<IdealyMissionDatabaseRecord[]>(
    request,
    `missions?select=id,title,status,way,dna,validation,created_at&id=eq.${encodeURIComponent(missionId)}&limit=1`,
    { cache: "no-store", method: "GET" }
  );
  return Array.isArray(records) ? records[0] ?? null : null;
}

export async function listIdealyMissionAgentRuns({
  missionId,
  request,
}: {
  missionId: string;
  request: Request;
}): Promise<IdealyMissionAgentRun[]> {
  const runs = await callSupabaseRest<IdealyMissionAgentRun[]>(
    request,
    `mission_agent_runs?select=id,mission_id,run_key,step_index,agent_key,status,started_at,completed_at&mission_id=eq.${encodeURIComponent(missionId)}&order=step_index.asc&limit=100`,
    { cache: "no-store", method: "GET" }
  );
  return Array.isArray(runs) ? runs : [];
}

export async function listIdealyMissionCheckpoints({
  missionId,
  request,
}: {
  missionId: string;
  request: Request;
}): Promise<IdealyMissionCheckpoint[]> {
  const missions = await callSupabaseRest<Array<{ snapshots?: unknown }>>(
    request,
    `missions?select=snapshots&id=eq.${encodeURIComponent(missionId)}&limit=1`,
    { cache: "no-store", method: "GET" }
  );
  const snapshots = missions[0]?.snapshots;
  return Array.isArray(snapshots) ? snapshots as IdealyMissionCheckpoint[] : [];
}

export async function createIdealyMissionCheckpoint({
  missionId,
  request,
  snapshot,
}: {
  missionId: string;
  request: Request;
  snapshot: IdealyMissionCheckpoint;
}): Promise<IdealyMissionCheckpoint> {
  return callSupabaseRest<IdealyMissionCheckpoint>(
    request,
    "rpc/create_mission_checkpoint",
    {
      body: JSON.stringify({ p_mission_id: missionId, p_snapshot: snapshot }),
      method: "POST",
    }
  );
}

export async function restoreIdealyMissionCheckpoint({
  checkpointId,
  missionId,
  request,
}: {
  checkpointId: string;
  missionId: string;
  request: Request;
}): Promise<{ checkpointId: string; restoredFilesCount: number }> {
  return callSupabaseRest<{ checkpointId: string; restoredFilesCount: number }>(
    request,
    "rpc/restore_mission_checkpoint",
    {
      body: JSON.stringify({ p_checkpoint_id: checkpointId, p_mission_id: missionId }),
      method: "POST",
    }
  );
}

export function classifyIntentLocally(prompt: string): IdealyIntentCategory {
  const lower = prompt.toLowerCase().trim();
  const buildPattern = /\b(app|application|web app|mobile app|website|site web|site|page|dashboard|composant|interface|ui|ux|code|projet|react|next|vue|frontend|front-end|fullstack|full-stack|software|logiciel)\b/i;
  const execPattern = /\b(crée|creer|créer|génère|generer|générer|construis|construire|implémente|implémenter|code|lance|lancer|build|make|create|generate|develop|developpe|développe|implement|write|scaffold)\b/i;
  const ideationPattern = /\b(idée|idee|propose|proposer|brainstorm|concept|suggestion|roadmap)\b/i;

  if (execPattern.test(lower) && buildPattern.test(lower)) {
    return "EXECUTION";
  }
  if (ideationPattern.test(lower)) {
    return "IDEATION";
  }
  return "CONVERSATION";
}

export async function classifyIdealyIntent(
  request: Request,
  prompt: string
): Promise<IdealyIntentCategory> {
  try {
    const payload = await callProcessAIRequest<IdealyIntentResponse>(request, {
      intentOnly: true,
      prompt,
    });

    if (isIntentCategory(payload.intent)) {
      return payload.intent;
    }
  } catch (error) {
    console.warn("Classification distante indisponible, repli local:", error);
  }

  return classifyIntentLocally(prompt);
}

export async function createIdealyMission({
  chatId,
  intentCategory,
  prompt,
  request,
  way = "professional",
}: {
  chatId: string;
  intentCategory: IdealyIntentCategory;
  prompt: string;
  request: Request;
  way?: MissionWay;
}): Promise<IdealyMission> {
  const { userId } = await getSupabaseServerContext(request);
  const missionWay = normalizeMissionWay(way);
  const persona = getMissionPersona(missionWay);
  const payload = await callSupabaseRest<IdealyMissionResponse[]>(
    request,
    "missions",
    {
      body: JSON.stringify({
        kind: "application",
        brief: {
          chatId,
          intentCategory,
          prompt,
          version: 1,
        },
        dna: { intentCategory, stage: "planning", voiceProfile: persona },
        status: "draft",
        title: prompt.slice(0, 120) || "Nouvelle mission",
        user_id: userId,
        way: missionWay,
      }),
      headers: {
        Prefer: "return=representation",
      },
      method: "POST",
    }
  );
  const mission = Array.isArray(payload) ? payload[0] : null;

  if (!mission || typeof mission.id !== "string") {
    throw new Error("Supabase n’a pas renvoyé l’identifiant de mission.");
  }

  return {
    id: mission.id,
    status: typeof mission.status === "string" ? mission.status : null,
  };
}

export async function updateIdealyMission({
  brief,
  dna,
  missionId,
  request,
  status,
  validation,
}: {
  brief?: Record<string, unknown>;
  dna?: Record<string, unknown>;
  missionId: string;
  request: Request;
  status:
    | "draft"
    | "planned"
    | "building"
    | "ready"
    | "needs-fix"
    | "published";
  validation?: Record<string, unknown>;
}) {
  await callSupabaseRest<unknown>(request, `missions?id=eq.${missionId}`, {
    body: JSON.stringify({
      ...(brief ? { brief } : {}),
      ...(dna ? { dna } : {}),
      ...(validation ? { validation } : {}),
      status,
    }),
    headers: {
      Prefer: "return=minimal",
    },
    method: "PATCH",
  });
}

export async function createIdealyMissionPlan({
  idempotencyKey,
  missionId,
  model,
  prompt,
  provider,
  request,
  way = "professional",
  requestedAgent,
}: {
  idempotencyKey: string;
  missionId?: string;
  model?: string;
  prompt: string;
  provider?: string;
  request: Request;
  way?: MissionWay;
  requestedAgent?: string | null;
}): Promise<MissionPlan> {
  const design = buildDesignSpecification(prompt);
  const designCritic = runDesignCritic(design);
  const payload = await callProcessAIRequest<IdealyPlanResponse>(request, {
    idempotencyKey,
    intentCategory: "IDEATION",
    ...(model ? { model } : {}),
    ...(missionId ? { missionId } : {}),
    maxTokens: 2000,
    mode: "auto",
    ...(provider ? { provider } : {}),
    planOnly: true,
    prompt,
    stream: false,
    systemPrompt: `${MISSION_PLAN_SYSTEM_PROMPT}\n\n${designSpecificationToPrompt(design)}${missionPersonaPrompt(way)}${requestedAgent ? `\n\nThe user explicitly selected @${requestedAgent} as the first responder. Frame the plan from this agent’s specialty and voice while keeping every planned responsibility accurate to the squad. Do not claim this agent performed build steps or tools yet.` : ""}`,
  });

  return { ...parseMissionPlan(payload.plan), design, designCritic };
}
