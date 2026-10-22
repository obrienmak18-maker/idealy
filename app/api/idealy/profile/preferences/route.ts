import { auth } from "@/app/(auth)/auth";
import { getToken } from "next-auth/jwt";
import { isDevelopmentEnvironment } from "@/lib/constants";
import { isIdealyWay } from "@/lib/idealy/product-contract";
import { getUserById } from "@/lib/db/queries";
import { signInFirebaseUserThroughSupabase } from "@/lib/idealy/supabase-auth";

type RequestIdentity = {
  accessToken: string;
  userId: string;
};

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

async function getAuthToken(request: Request) {
  return getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });
}

async function resolveSupabaseIdentity(
  token: Record<string, unknown>,
): Promise<RequestIdentity | null> {
  const storedAccessToken =
    typeof token.supabaseAccessToken === "string" && token.supabaseAccessToken.trim()
      ? token.supabaseAccessToken.trim()
      : null;
  const storedUserId =
    typeof token.supabaseUserId === "string" && token.supabaseUserId.trim()
      ? token.supabaseUserId.trim()
      : null;

  if (storedAccessToken && storedUserId) {
    return { accessToken: storedAccessToken, userId: storedUserId };
  }

  let email =
    typeof token.email === "string" && token.email.trim()
      ? token.email.trim().toLowerCase()
      : null;

  if (!email && typeof token.id === "string" && token.id) {
    const localUser = await getUserById(token.id).catch(() => null);
    if (localUser?.email) email = localUser.email.trim().toLowerCase();
  }

  if (!email || email.endsWith("@idealy.local") || email.startsWith("guest-")) {
    return null;
  }

  try {
    const bridge = await signInFirebaseUserThroughSupabase(email);
    if (bridge.status === "authenticated" && bridge.accessToken && bridge.userId) {
      return { accessToken: bridge.accessToken, userId: bridge.userId };
    }
  } catch (error) {
    console.error("Idealy profile preferences session bridge failed:", error);
  }

  return null;
}

async function getIdentity(request: Request): Promise<RequestIdentity | null> {
  let token = await getAuthToken(request);

  if (!token) {
    const session = await auth().catch(() => null);
    if (session?.user?.id) {
      token = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        supabaseAccessToken: session.user.supabaseAccessToken,
        supabaseUserId: session.user.supabaseUserId ?? undefined,
        type: session.user.type,
      };
    }
  }

  return token ? resolveSupabaseIdentity(token) : null;
}

function trustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function databaseConfig() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  return url && anonKey ? { url, anonKey } : null;
}

export async function GET(request: Request) {
  if (process.env.DEMO_MODE === "true") {
    const cookies = request.headers.get("cookie") ?? "";
    const wayValue = cookies.match(/(?:^|;\s*)idealy_user_way=([^;]+)/)?.[1];
    const languageValue = cookies.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/)?.[1];
    return json({
      simulated: true,
      way: isIdealyWay(wayValue) ? wayValue : "ninja",
      preferredLanguage:
        languageValue === "fr" || languageValue === "en" || languageValue === "es"
          ? languageValue
          : "fr",
      timezone: "UTC",
      displayName: null,
      accountEmail: null,
    });
  }

  const identity = await getIdentity(request);
  if (!identity) {
    return json({ error: "Une session Idealy authentifiée est requise." }, 401);
  }

  const config = databaseConfig();
  if (!config) {
    return json({ error: "Le service de préférences est indisponible." }, 503);
  }

  try {
    const response = await fetch(
      config.url +
        "/rest/v1/profiles?select=id,email,display_name,first_name,last_name,way,preferred_language,timezone,onboarding_completed&id=eq." +
        encodeURIComponent(identity.userId) +
        "&limit=1",
      {
        cache: "no-store",
        headers: {
          Authorization: "Bearer " + identity.accessToken,
          apikey: config.anonKey,
          "Cache-Control": "no-cache",
        },
      },
    );

    if (!response.ok) {
      return json({ error: "Les préférences du profil n’ont pas pu être chargées." }, 503);
    }

    const rows = (await response.json().catch(() => [])) as Array<Record<string, unknown>>;
    const profile = rows[0];
    if (!profile || profile.onboarding_completed !== true) {
      return json({ error: "Termine d’abord la configuration de ton profil Idealy." }, 409);
    }

    return json({
      way: isIdealyWay(profile.way) ? profile.way : "professional",
      preferredLanguage:
        profile.preferred_language === "fr" ||
        profile.preferred_language === "en" ||
        profile.preferred_language === "es"
          ? profile.preferred_language
          : "fr",
      timezone: typeof profile.timezone === "string" ? profile.timezone : "UTC",
      displayName:
        typeof profile.display_name === "string"
          ? profile.display_name
          : [profile.first_name, profile.last_name].filter(Boolean).join(" "),
      accountEmail:
        typeof profile.email === "string" ? profile.email : null,
    });
  } catch (error) {
    console.error("Idealy profile preferences read failed:", error);
    return json({ error: "Les préférences du profil sont momentanément indisponibles." }, 503);
  }
}

export async function PATCH(request: Request) {
  if (!trustedOrigin(request)) {
    return json({ error: "Origine de requête non autorisée." }, 403);
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return json({ error: "Le format de requête est invalide." }, 415);
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || Array.isArray(body)) {
    return json({ error: "Les préférences envoyées sont invalides." }, 400);
  }

  const updates: { p_way?: string; p_preferred_language?: string; p_timezone?: string } = {};
  if ("way" in body) {
    if (!isIdealyWay(body.way)) return json({ error: "Cette voie de travail n’est pas valide." }, 400);
    updates.p_way = body.way;
  }
  if ("preferredLanguage" in body) {
    if (body.preferredLanguage !== "fr" && body.preferredLanguage !== "en" && body.preferredLanguage !== "es") {
      return json({ error: "Cette langue n’est pas prise en charge." }, 400);
    }
    updates.p_preferred_language = body.preferredLanguage;
  }
  if ("timezone" in body) {
    if (
      typeof body.timezone !== "string" ||
      !body.timezone.trim() ||
      body.timezone.trim().length > 64 ||
      !/^[A-Za-z0-9_+./-]+$/.test(body.timezone.trim())
    ) {
      return json({ error: "Le fuseau horaire est invalide." }, 400);
    }
    updates.p_timezone = body.timezone.trim();
  }
  if (Object.keys(updates).length === 0) {
    return json({ error: "Aucune préférence valide à enregistrer." }, 400);
  }

  if (process.env.DEMO_MODE === "true") {
    return json({
      saved: true,
      simulated: true,
      way: updates.p_way ?? null,
      preferredLanguage: updates.p_preferred_language ?? null,
      timezone: updates.p_timezone ?? null,
    });
  }

  const identity = await getIdentity(request);
  if (!identity) {
    return json({ error: "Une session Idealy authentifiée est requise." }, 401);
  }

  const config = databaseConfig();
  if (!config) {
    return json({ error: "Le service de préférences est indisponible." }, 503);
  }

  try {
    const response = await fetch(config.url + "/rest/v1/rpc/update_my_settings", {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: "Bearer " + identity.accessToken,
        apikey: config.anonKey,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(updates),
    });

    const payload = (await response.json().catch(() => null)) as
      | Array<Record<string, unknown>>
      | { message?: string; details?: string; hint?: string }
      | null;

    if (!response.ok) {
      const details =
        payload && !Array.isArray(payload) && typeof payload.message === "string"
          ? payload.message
          : "";
      console.error("Idealy update_my_settings failed:", response.status, details);
      return json(
        {
          error:
            response.status === 401 || response.status === 403
              ? "La session ne permet pas de modifier ces préférences."
              : "Impossible d’enregistrer les préférences sur le compte. Vérifie que le contrat de préférences Supabase est déployé.",
        },
        response.status === 401 || response.status === 403 ? response.status : 503,
      );
    }

    const row = Array.isArray(payload) ? payload[0] : null;
    if (!row) {
      return json({ error: "Aucune préférence n’a été modifiée sur le profil." }, 409);
    }

    return json({
      saved: true,
      way: isIdealyWay(row.way) ? row.way : undefined,
      preferredLanguage:
        row.preferred_language === "fr" ||
        row.preferred_language === "en" ||
        row.preferred_language === "es"
          ? row.preferred_language
          : undefined,
      timezone: typeof row.timezone === "string" ? row.timezone : undefined,
    });
  } catch (error) {
    console.error("Idealy profile preferences update failed:", error);
    return json({ error: "Le service de préférences est momentanément indisponible." }, 503);
  }
}
