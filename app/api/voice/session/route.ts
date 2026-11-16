import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { verifyFirebaseToken } from "@/lib/firebase/admin";

const LIVE_MODEL = "gemini-3.8-live";
const LIVE_WEBSOCKET_BASE =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained";

export async function GET(request: Request) {
  const session = await auth().catch(() => null);
  let user = session?.user;

  if (!user) {
    const authorization = request.headers.get("authorization");
    const bearer = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : null;
    if (bearer) {
      const firebaseUser = await verifyFirebaseToken(bearer).catch(() => null);
      if (firebaseUser?.uid && firebaseUser.email_verified === true) {
        user = {
          email: firebaseUser.email ?? undefined,
          id: firebaseUser.uid,
          name: firebaseUser.name ?? undefined,
          type: "regular",
        };
      }
    }
  }

  if (!user) {
    return NextResponse.json(
      {
        configured: false,
        error: "Reconnectez-vous à Idealy pour ouvrir une session Live.",
      },
      { headers: { "Cache-Control": "no-store" }, status: 401 }
    );
  }

  const apiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json(
      {
        configured: false,
        error: "Le service vocal Live n’est pas configuré sur le serveur.",
      },
      { headers: { "Cache-Control": "no-store" }, status: 503 }
    );
  }

  // A short-lived, single-use token keeps the long-lived Gemini API key
  // on the server. The model is constrained server-side to prevent clients
  // from using this token with a different model.
  const now = Date.now();
  const tokenResponse = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/auth_tokens",
    {
      body: JSON.stringify({
        expireTime: new Date(now + 30 * 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: `models/${LIVE_MODEL}`,
        },
        newSessionExpireTime: new Date(now + 60 * 1000).toISOString(),
        uses: 1,
      }),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      method: "POST",
      signal: AbortSignal.timeout(10_000),
    }
  ).catch(() => null);

  if (!tokenResponse?.ok) {
    const detail = (await tokenResponse?.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    console.error(
      "[Live Voice] Could not provision an ephemeral Gemini token.",
      {
        message: detail?.error?.message ?? "token provisioning failed",
        status: tokenResponse?.status ?? 503,
      }
    );
    return NextResponse.json(
      {
        configured: false,
        error:
          "Impossible de préparer une session vocale Live. Réessayez dans un instant.",
      },
      { headers: { "Cache-Control": "no-store" }, status: 503 }
    );
  }

  const tokenPayload = (await tokenResponse.json().catch(() => null)) as {
    name?: unknown;
  } | null;
  const ephemeralToken =
    typeof tokenPayload?.name === "string" ? tokenPayload.name : null;

  if (!ephemeralToken) {
    console.error("[Live Voice] Gemini returned no ephemeral token name.");
    return NextResponse.json(
      {
        configured: false,
        error: "Gemini n’a pas fourni de jeton vocal utilisable.",
      },
      { headers: { "Cache-Control": "no-store" }, status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const requestedWay = (
    searchParams.get("way") ||
    request.headers.get("x-idealy-way") ||
    "ninja"
  ).toLowerCase();
  const requestedLang = (
    searchParams.get("lang") ||
    request.headers.get("x-idealy-lang") ||
    "fr"
  ).toLowerCase();

  // Map Ways to Gemini voices:
  // ninja -> Puck (energetic, agile, crisp)
  // mage -> Kore (creative, mystical, resonant)
  // hunter -> Fenrir (tactical, assertive, focused)
  // professional -> Charon (executive, articulate, measured)
  const WAY_VOICE_MAP: Record<string, string> = {
    hunter: "Fenrir",
    mage: "Kore",
    ninja: "Puck",
    professional: "Charon",
  };

  const voiceName = WAY_VOICE_MAP[requestedWay] ?? "Puck";

  const wsUrl = new URL(LIVE_WEBSOCKET_BASE);
  wsUrl.searchParams.set("access_token", ephemeralToken);

  return NextResponse.json(
    {
      configured: true,
      language: requestedLang,
      model: LIVE_MODEL,
      sampleRate: 16_000,
      voiceName,
      way: requestedWay,
      wsUrl: wsUrl.toString(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
