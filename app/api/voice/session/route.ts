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
          id: firebaseUser.uid,
          email: firebaseUser.email ?? undefined,
          name: firebaseUser.name ?? undefined,
          type: "regular",
        };
      }
    }
  }

  if (!user) {
    return NextResponse.json(
      { configured: false, error: "Reconnectez-vous à Idealy pour ouvrir une session Live." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const apiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json(
      { configured: false, error: "Le service vocal Live n’est pas configuré sur le serveur." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  // A short-lived, single-use token keeps the long-lived Gemini API key
  // on the server. The model is constrained server-side to prevent clients
  // from using this token with a different model.
  const now = Date.now();
  const tokenResponse = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/auth_tokens",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        uses: 1,
        expireTime: new Date(now + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(now + 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: `models/${LIVE_MODEL}`,
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  ).catch(() => null);

  if (!tokenResponse?.ok) {
    const detail = await tokenResponse?.json().catch(() => null) as
      | { error?: { message?: string } }
      | null;
    console.error("[Live Voice] Could not provision an ephemeral Gemini token.", {
      status: tokenResponse?.status ?? 503,
      message: detail?.error?.message ?? "token provisioning failed",
    });
    return NextResponse.json(
      { configured: false, error: "Impossible de préparer une session vocale Live. Réessayez dans un instant." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const tokenPayload = await tokenResponse.json().catch(() => null) as
    | { name?: unknown }
    | null;
  const ephemeralToken =
    typeof tokenPayload?.name === "string" ? tokenPayload.name : null;

  if (!ephemeralToken) {
    console.error("[Live Voice] Gemini returned no ephemeral token name.");
    return NextResponse.json(
      { configured: false, error: "Gemini n’a pas fourni de jeton vocal utilisable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const wsUrl = new URL(LIVE_WEBSOCKET_BASE);
  wsUrl.searchParams.set("access_token", ephemeralToken);

  return NextResponse.json(
    {
      configured: true,
      model: LIVE_MODEL,
      wsUrl: wsUrl.toString(),
      sampleRate: 16000,
      voiceName: "Aoede",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
