import { getToken } from "next-auth/jwt";
import { isDevelopmentEnvironment } from "@/lib/constants";
import { getIdealyAiFunctionUrl } from "./config";
import {
  buildDesignSpecification,
  designSpecificationToPrompt,
  runDesignCritic,
  type DesignSpecification,
} from "./design-engine";

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

const MISSION_PLAN_SYSTEM_PROMPT = `You are the Idealy mission planner. Return only valid JSON, with no markdown fences and no extra text. The JSON must contain exactly these useful fields: projectKind (string), intention (string), v1Scope (string), agents (array of 1 to 8 objects with name, responsibility, result strings), and nextStep (string). Keep the first version practical and explain what each specialized agent will deliver. The Design Engine specification appended to this prompt is authoritative for visual strategy; do not silently override explicit user technology choices.`;

function isIntentCategory(value: unknown): value is IdealyIntentCategory {
  return (
    value === "CONVERSATION" ||
    value === "IDEATION" ||
    value === "EXECUTION"
  );
}

function parseMissionPlan(value: unknown): Omit<MissionPlan, "design" | "designCritic"> {
  if (!value || typeof value !== "object") {
    throw new Error("Le backend Idealy n’a pas renvoyé de plan de mission.");
  }

  const candidate = value as Partial<MissionPlan>;
  const agents = Array.isArray(candidate.agents)
    ? candidate.agents
        .filter(
          (agent): agent is MissionPlanAgent =>
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
        .filter(
          (agent) => agent.name && agent.responsibility && agent.result
        )
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

async function getSupabaseServerContext(request: Request) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });
  const accessToken =
    typeof token?.supabaseAccessToken === "string"
      ? token.supabaseAccessToken
      : null;
  const userId =
    typeof token?.supabaseUserId === "string" ? token.supabaseUserId : null;
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();

  if (!accessToken || !userId || !url || !anonKey) {
    throw new Error(
      "La session Supabase et la configuration serveur sont nécessaires au backend Idealy."
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
  init: RequestInit
): Promise<T> {
  const { accessToken, anonKey, url } = await getSupabaseServerContext(request);
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

export async function classifyIdealyIntent(
  request: Request,
  prompt: string
): Promise<IdealyIntentCategory> {
  const payload = await callProcessAIRequest<IdealyIntentResponse>(request, {
    intentOnly: true,
    prompt,
  });

  if (!isIntentCategory(payload.intent)) {
    throw new Error("Le backend Idealy a renvoyé une intention invalide.");
  }

  return payload.intent;
}

export async function createIdealyMission({
  chatId,
  intentCategory,
  prompt,
  request,
}: {
  chatId: string;
  intentCategory: IdealyIntentCategory;
  prompt: string;
  request: Request;
}): Promise<IdealyMission> {
  const { userId } = await getSupabaseServerContext(request);
  const payload = await callSupabaseRest<IdealyMissionResponse[]>(
    request,
    "missions",
    {
      body: JSON.stringify({
        brief: {
          chatId,
          intentCategory,
          prompt,
          version: 1,
        },
        dna: { intentCategory, stage: "planning" },
        status: "draft",
        title: prompt.slice(0, 120) || "Nouvelle mission",
        user_id: userId,
        way: "professional",
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
  status: "draft" | "planned" | "building" | "ready" | "needs-fix" | "published";
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
}: {
  idempotencyKey: string;
  missionId?: string;
  model?: string;
  prompt: string;
  provider?: string;
  request: Request;
}): Promise<MissionPlan> {
  const design = buildDesignSpecification(prompt);
  const designCritic = runDesignCritic(design);
  const payload = await callProcessAIRequest<IdealyPlanResponse>(request, {
    idempotencyKey,
    intentCategory: "IDEATION",
    ...(model ? { model } : {}),
    ...(missionId ? { missionId } : {}),
    maxTokens: 2_000,
    mode: "auto",
    ...(provider ? { provider } : {}),
    planOnly: true,
    prompt,
    stream: false,
    systemPrompt: `${MISSION_PLAN_SYSTEM_PROMPT}\n\n${designSpecificationToPrompt(design)}`,
  });

  return { ...parseMissionPlan(payload.plan), design, designCritic };
}
