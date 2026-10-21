import { auth } from "@/app/(auth)/auth";
import { getToken } from "next-auth/jwt";
import { isDevelopmentEnvironment } from "@/lib/constants";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const MAX_FIELD_LENGTH = 2400;

type EditablePlan = {
  projectKind: string;
  intention: string;
  v1Scope: string;
  nextStep: string;
  agents: Array<{ name: string; responsibility: string; result: string }>;
};

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

function parsePlan(value: unknown): EditablePlan | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const fields = ["projectKind", "intention", "v1Scope", "nextStep"] as const;
  const normalized: Record<(typeof fields)[number], string> = {
    projectKind: "",
    intention: "",
    v1Scope: "",
    nextStep: "",
  };

  for (const field of fields) {
    if (
      typeof raw[field] !== "string" ||
      !(raw[field] as string).trim() ||
      (raw[field] as string).trim().length > MAX_FIELD_LENGTH
    ) {
      return null;
    }
    normalized[field] = (raw[field] as string).trim();
  }

  if (!Array.isArray(raw.agents) || raw.agents.length < 1 || raw.agents.length > 6) {
    return null;
  }

  const agents = raw.agents.map((candidate) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
    const item = candidate as Record<string, unknown>;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const responsibility = typeof item.responsibility === "string" ? item.responsibility.trim() : "";
    const result = typeof item.result === "string" ? item.result.trim() : "";
    if (
      !name || !responsibility || !result ||
      name.length > 120 || responsibility.length > 500 || result.length > 800
    ) return null;
    return { name, responsibility, result };
  });

  if (agents.some((agent) => agent === null)) return null;
  return { ...normalized, agents: agents as EditablePlan["agents"] };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ missionId: string }> },
) {
  const { missionId } = await params;
  if (!UUID_PATTERN.test(missionId)) {
    return json({ error: "Identifiant de mission invalide." }, 400);
  }

  const requestOrigin = request.headers.get("origin");
  if (requestOrigin) {
    try {
      if (requestOrigin !== new URL(request.url).origin) {
        return json({ error: "Origine de requête non autorisée." }, 403);
      }
    } catch {
      return json({ error: "Origine de requête invalide." }, 403);
    }
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return json({ error: "Le format de la requête doit être JSON." }, 415);
  }

  const session = await auth().catch(() => null);
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });
  const userId = session?.user?.id ??
    (typeof token?.sub === "string" ? token.sub : null);
  const accessToken =
    typeof token?.supabaseAccessToken === "string" ? token.supabaseAccessToken : null;

  if (!userId || !accessToken) {
    return json({ error: "Une session Idealy authentifiée est requise." }, 401);
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const plan = parsePlan(body?.plan);
  if (!plan) {
    return json({ error: "Le plan est incomplet ou contient des champs invalides." }, 400);
  }

  const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) {
    return json({ error: "Le service de mission est momentanément indisponible." }, 503);
  }

  const headers = {
    Authorization: "Bearer " + accessToken,
    apikey: anonKey,
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };

  try {
    const lookup = await fetch(
      supabaseUrl + "/rest/v1/missions?select=id,brief,dna,status&id=eq." +
        encodeURIComponent(missionId) + "&user_id=eq." + encodeURIComponent(userId) + "&limit=1",
      { headers, cache: "no-store" },
    );
    if (!lookup.ok) return json({ error: "Impossible de vérifier cette mission." }, 503);
    const rows = await lookup.json() as Array<Record<string, unknown>>;
    const mission = rows[0];
    if (!mission) return json({ error: "Mission introuvable ou inaccessible." }, 404);

    if (["building", "ready", "published"].includes(String(mission.status ?? ""))) {
      return json({ error: "Le plan ne peut plus être modifié après le lancement de la mission." }, 409);
    }

    const currentBrief =
      mission.brief && typeof mission.brief === "object" && !Array.isArray(mission.brief)
        ? mission.brief as Record<string, unknown>
        : {};

    const updatedBrief = {
      ...currentBrief,
      intention: plan.intention,
      nextStep: plan.nextStep,
      projectKind: plan.projectKind,
      plan,
      v1Scope: plan.v1Scope,
    };
    const currentDna =
      mission.dna && typeof mission.dna === "object" && !Array.isArray(mission.dna)
        ? mission.dna as Record<string, unknown>
        : {};
    const updatedDna = { ...currentDna, plan };

    const update = await fetch(
      supabaseUrl + "/rest/v1/missions?id=eq." +
        encodeURIComponent(missionId) + "&user_id=eq." + encodeURIComponent(userId),
      {
        method: "PATCH",
        headers: {
          ...headers,
          Prefer: "return=representation",
        },
        body: JSON.stringify({ brief: updatedBrief, dna: updatedDna }),
        cache: "no-store",
      },
    );
    const updatedRows = await update.json().catch(() => null) as Array<Record<string, unknown>> | null;
    if (!update.ok || !Array.isArray(updatedRows) || updatedRows.length === 0) {
      return json({ error: "Le plan n’a pas pu être enregistré sur la mission." }, 503);
    }

    return json({ saved: true, plan, missionId });
  } catch (error) {
    console.error("Mission plan update failed:", error);
    return json({ error: "Le plan n’a pas pu être enregistré. Réessaie." }, 503);
  }
}
