import { getToken } from "next-auth/jwt";
import {
  completeMyIdealyOnboarding,
  getMyIdealyOnboardingStatus,
} from "@/lib/idealy/backend-adapter";
import { onboardingInputSchema } from "@/lib/idealy/onboarding-contract";
import { isDevelopmentEnvironment } from "@/lib/constants";

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

  if (typeof token.supabaseAccessToken !== "string" || !token.supabaseAccessToken) {
    return response(
      { error: "La session Supabase active est requise pour vérifier le profil." },
      503,
    );
  }

  try {
    return response(await getMyIdealyOnboardingStatus({ request }));
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

  if (typeof token.supabaseAccessToken !== "string" || !token.supabaseAccessToken) {
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
