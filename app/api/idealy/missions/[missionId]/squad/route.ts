import { getToken } from "next-auth/jwt";
import { isDevelopmentEnvironment } from "@/lib/constants";
import { getIdealySupabaseFunctionUrl } from "@/lib/idealy/config";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ missionId: string }> },
) {
  const { missionId } = await params;
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });
  const supabaseAccessToken = typeof token?.supabaseAccessToken === "string" ? token.supabaseAccessToken : null;
  if (!supabaseAccessToken) return Response.json({ error: "Une session Idealy authentifiée est requise." }, { status: 401 });

  const input = (await request.json().catch(() => null)) as { idempotencyKey?: unknown } | null;
  if (!input || typeof input.idempotencyKey !== "string") {
    return Response.json({ error: "Une clé d’idempotence est requise pour lancer une mission." }, { status: 400 });
  }
  try {
    const response = await fetch(getIdealySupabaseFunctionUrl("orchestrate-mission"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseAccessToken}`,
        "Content-Type": "application/json",
        ...(process.env.SUPABASE_ANON_KEY ? { apikey: process.env.SUPABASE_ANON_KEY } : {}),
      },
      body: JSON.stringify({ idempotencyKey: input.idempotencyKey, missionId }),
    });
    return new Response(response.body, {
      status: response.status,
      headers: { "Cache-Control": "no-store", "Content-Type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch (error) {
    console.error("Mission squad proxy failed", error);
    return Response.json({ error: "L’escouade Idealy est momentanément indisponible." }, { status: 502 });
  }
}
