import { getToken } from "next-auth/jwt";
import {
  completeMyIdealyOnboarding,
  getMyIdealyOnboardingStatus,
} from "@/lib/idealy/backend-adapter";
import { onboardingInputSchema } from "@/lib/idealy/onboarding-contract";
import { isDevelopmentEnvironment } from "@/lib/constants";
import { getUserById } from "@/lib/db/queries";
import { signInFirebaseUserThroughSupabase } from "@/lib/idealy/supabase-auth";

function response(
  body: Record<string, unknown>,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return Response.json(body, {
    headers: {
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
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

async function resolveSupabaseToken(
  token: Record<string, unknown>,
): Promise<{ accessToken: string; userId: string } | null> {
  const accessToken =
    typeof token.supabaseAccessToken === "string" && token.supabaseAccessToken
      ? token.supabaseAccessToken.trim()
      : null;
  const userId =
    typeof token.supabaseUserId === "string" && token.supabaseUserId
      ? token.supabaseUserId.trim()
      : null;

  if (accessToken && userId) {
    return { accessToken, userId };
  }

  let email =
    typeof token.email === "string" && token.email.trim()
      ? token.email.trim().toLowerCase()
      : null;

  if (!email && typeof token.id === "string" && token.id) {
    const localUser = await getUserById(token.id).catch(() => null);
    if (localUser?.email) {
      email = localUser.email.trim().toLowerCase();
    }
  }

  if (email && !email.endsWith("@idealy.local") && !email.startsWith("guest-")) {
    try {
      const bridge = await signInFirebaseUserThroughSupabase(email);
      if (bridge.status === "authenticated" && bridge.accessToken && bridge.userId) {
        token.supabaseAccessToken = bridge.accessToken;
        token.supabaseUserId = bridge.userId;
        return { accessToken: bridge.accessToken, userId: bridge.userId };
      }
    } catch (err) {
      console.error("Auto-bridge failed in resolveSupabaseToken:", err);
    }
  }

  return null;
}

function hasTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  if (process.env.DEMO_MODE === "true") {
    return response({
      firstName: null,
      onboardingCompleted: false,
      profileExists: true,
      simulated: true,
      way: "professional",
    });
  }

  const token = await getAuthToken(request);
  if (!token) {
    return response({ error: "Une session Idealy authentifiée est requise." }, 401);
  }

  const supabaseContext = await resolveSupabaseToken(token);
  if (!supabaseContext) {
    return response(
      { error: "La session Supabase active est requise pour vérifier le profil." },
      503,
    );
  }

  try {
    return response(
      await getMyIdealyOnboardingStatus({
        contextOverride: supabaseContext,
        request,
      }),
    );
  } catch (error) {
    console.error("Idealy onboarding profile check failed", error);
    return response(
      {
        error: "Le profil Idealy n’a pas pu être vérifié. Réessayez dans un instant.",
      },
      503,
    );
  }
}

export async function POST(request: Request) {
  if (process.env.DEMO_MODE === "true") {
    const parsedDemoInput = onboardingInputSchema.safeParse(
      await request.json().catch(() => null),
    );

    if (!parsedDemoInput.success) {
      return response(
        { error: "Les informations d’onboarding sont invalides." },
        400,
      );
    }

    return response({
      displayName:
        `${parsedDemoInput.data.firstName} ${parsedDemoInput.data.lastName}`.trim() ||
        null,
      onboardingCompleted: true,
      simulated: true,
      way: parsedDemoInput.data.way,
    });
  }

  const token = await getAuthToken(request);
  if (!token) {
    return response({ error: "Une session Idealy authentifiée est requise." }, 401);
  }

  const supabaseContext = await resolveSupabaseToken(token);
  if (!supabaseContext) {
    return response(
      { error: "La session Supabase active est requise pour enregistrer le profil." },
      503,
    );
  }

  if (!hasTrustedOrigin(request)) {
    return response({ error: "Origine de requête non autorisée." }, 403);
  }

  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return response({ error: "Le format de requête est invalide." }, 415);
  }

  const parsed = onboardingInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return response(
      { error: "Les informations d’onboarding sont invalides." },
      400,
    );
  }

  try {
    const profile = await completeMyIdealyOnboarding({
      contextOverride: supabaseContext,
      input: parsed.data,
      request,
    });
    return response(profile);
  } catch (error) {
    console.error("Idealy onboarding persistence failed", error);
    return response(
      {
        error:
          "Le profil n’a pas pu être enregistré dans Supabase. Aucun statut local n’a été appliqué.",
      },
      503,
    );
  }
}
