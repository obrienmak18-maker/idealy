import { getToken } from "next-auth/jwt";
import {
  completeMyIdealyOnboarding,
  getMyIdealyOnboardingStatus,
} from "@/lib/idealy/backend-adapter";
import { onboardingInputSchema } from "@/lib/idealy/onboarding-contract";
import { isDevelopmentEnvironment } from "@/lib/constants";

function response(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

async function hasSupabaseSession(request: Request) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  return typeof token?.supabaseAccessToken === "string";
}

function hasTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin;
}

export async function GET(request: Request) {
  if (process.env.DEMO_MODE === "true") {
    return response({
      firstName: null,
      onboardingCompleted: false,
      profileExists: true,
      way: "professional",
    });
  }

  if (!(await hasSupabaseSession(request))) {
    return response({ error: "Une session Idealy authentifiée est requise." }, 401);
  }

  try {
    return response(await getMyIdealyOnboardingStatus({ request }));
  } catch (error) {
    console.error("Unable to read Idealy onboarding status", error);
    return response({ error: "Le profil Idealy est momentanément indisponible." }, 503);
  }
}

export async function POST(request: Request) {
  if (process.env.DEMO_MODE === "true") {
    const parsedDemoInput = onboardingInputSchema.safeParse(
      await request.json().catch(() => null)
    );
    if (!parsedDemoInput.success) {
      return response({ error: "Les informations d’onboarding sont invalides." }, 400);
    }
    return response({
      displayName: `${parsedDemoInput.data.firstName} ${parsedDemoInput.data.lastName}`.trim() || null,
      onboardingCompleted: true,
      way: parsedDemoInput.data.way,
    });
  }

  if (!(await hasSupabaseSession(request))) {
    return response({ error: "Une session Idealy authentifiée est requise." }, 401);
  }

  if (!hasTrustedOrigin(request)) {
    return response({ error: "Origine de requête non autorisée." }, 403);
  }

  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return response({ error: "Le format de requête est invalide." }, 415);
  }

  const parsed = onboardingInputSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return response({ error: "Les informations d’onboarding sont invalides." }, 400);
  }

  try {
    const profile = await completeMyIdealyOnboarding({
      input: parsed.data,
      request,
    });
    return response(profile);
  } catch (error) {
    console.error("Unable to complete Idealy onboarding", error);
    return response({ error: "La finalisation du profil est momentanément indisponible." }, 503);
  }
}
