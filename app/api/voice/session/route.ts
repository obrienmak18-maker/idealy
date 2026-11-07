import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { verifyFirebaseToken } from "@/lib/firebase/admin";

export async function GET(request: Request) {
  const session = await auth();
  let user = session?.user;

  if (!user) {
    const authHeader = request.headers.get("authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (bearer) {
      const fbUser = await verifyFirebaseToken(bearer);
      if (fbUser) {
        user = {
          id: fbUser.uid,
          email: fbUser.email ?? undefined,
          name: fbUser.name ?? undefined,
          type: "regular",
        };
      }
    }
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json(
      {
        configured: false,
        error: "GEMINI_API_KEY not configured on server",
      },
      { status: 200 }
    );
  }

  // Model choice: gemini-2.0-flash-exp / gemini-3.8-live
  const model = "gemini-2.0-flash-exp";
  const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

  return NextResponse.json({
    configured: true,
    model,
    wsUrl,
    sampleRate: 16000,
    voiceName: "Aoede", // Warm, natural Gemini voice
  });
}
