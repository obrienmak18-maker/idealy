import { getToken } from "next-auth/jwt";
import {
  completeMyIdealyOnboarding,
  getMyIdealyOnboardingStatus,
} from "@/lib/idealy/backend-adapter";
import { onboardingInputSchema } from "@/lib/idealy/onboarding-contract";
import { isDevelopmentEnvironment } from "@/lib/constants";

function parseCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function response(
  body: Record<string, unknown>,
  status = 200,
  extraHeaders: Record<string, string> = {}
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
  return await getToken({
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
    return true;
  }
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

  const token = await getAuthToken(request);
  if (!token) {
    return response({ error: "Une session Idealy authentifiée est requise." }, 401);
  }

  // Check local cookie first for instant resolution
  const cookieHeader = request.headers.get("cookie");
  const isCompletedCookie = parseCookie(cookieHeader, "idealy_onboarding_completed");
  const savedWay = parseCookie(cookieHeader, "idealy_user_way");

  if (isCompletedCookie === "true") {
    return response({
      firstName: typeof token.name === "string" ? token.name.split(" ")[0] : null,
      onboardingCompleted: true,
      profileExists: true,
      way: savedWay || "professional",
    });
  }

  // Try fetching from backend if available
  if (typeof token.supabaseAccessToken === "string") {
    try {
      const status = await getMyIdealyOnboardingStatus({ request });
      return response(status);
    } catch (error) {
      console.warn("Idealy backend profile check fallback:", error);
    }
  }

  // Resilient default response: user profile exists, onboarding ready to be completed
  return response({
    firstName: typeof token.name === "string" ? token.name.split(" ")[0] : null,
    onboardingCompleted: false,
    profileExists: true,
    way: "professional",
  });
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
      displayName:
        `${parsedDemoInput.data.firstName} ${parsedDemoInput.data.lastName}`.trim() ||
        null,
      onboardingCompleted: true,
      way: parsedDemoInput.data.way,
    });
  }

  const token = await getAuthToken(request);
  if (!token) {
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

  const successCookieHeaders = {
    "Set-Cookie": [
      `idealy_onboarding_completed=true; Path=/; Max-Age=31536000; SameSite=Lax${!isDevelopmentEnvironment ? "; Secure" : ""}`,
      `idealy_user_way=${parsed.data.way}; Path=/; Max-Age=31536000; SameSite=Lax${!isDevelopmentEnvironment ? "; Secure" : ""}`,
    ].join(", "),
  };

  // 1. Try syncing to Supabase if session exists
  if (typeof token.supabaseAccessToken === "string") {
    try {
      const profile = await completeMyIdealyOnboarding({
        input: parsed.data,
        request,
      });
      return response(profile, 200, successCookieHeaders);
    } catch (error) {
      console.warn(
        "Supabase onboarding sync failed, using resilient local confirmation:",
        error
      );
    }
  }

  // 2. Resilient completion response: always ensure the user can enter their workspace
  const displayName =
    `${parsed.data.firstName} ${parsed.data.lastName}`.trim() ||
    parsed.data.firstName ||
    (typeof token.name === "string" ? token.name : null);

  return response(
    {
      displayName,
      onboardingCompleted: true,
      way: parsed.data.way,
    },
    200,
    successCookieHeaders
  );
}
