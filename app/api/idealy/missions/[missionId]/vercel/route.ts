import { getToken } from "next-auth/jwt";
import { auth } from "@/app/(auth)/auth";
import { isDevelopmentEnvironment } from "@/lib/constants";
import { getIdealySupabaseFunctionUrl } from "@/lib/idealy/config";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN = /^[a-zA-Z0-9_-]{32,180}$/;
const PROJECT_PATTERN = /^[a-z0-9-]{1,100}$/i;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ missionId: string }> }
) {
  const [session, token] = await Promise.all([
    auth(),
    getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      secureCookie: !isDevelopmentEnvironment,
    }),
  ]);
  const accessToken =
    typeof token?.supabaseAccessToken === "string"
      ? token.supabaseAccessToken
      : null;
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  if (!session?.user || !accessToken || !anonKey) {
    return Response.json(
      { error: "Une session Idealy authentifiée est requise." },
      { headers: { "Cache-Control": "no-store" }, status: 401 }
    );
  }

  const { missionId } = await params;
  if (!UUID_PATTERN.test(missionId)) {
    return Response.json({ error: "Invalid mission id" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as {
    confirmationToken?: unknown;
    projectName?: unknown;
    target?: unknown;
  } | null;
  const projectName =
    typeof body?.projectName === "string" ? body.projectName.trim() : "";
  const confirmationToken =
    typeof body?.confirmationToken === "string" ? body.confirmationToken : "";
  const target = body?.target === "production" ? "production" : "preview";
  if (
    !PROJECT_PATTERN.test(projectName) ||
    !TOKEN_PATTERN.test(confirmationToken) ||
    (body?.target !== "preview" && body?.target !== "production")
  ) {
    return Response.json(
      { error: "Le nom du projet, la cible et la confirmation sont requis." },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      getIdealySupabaseFunctionUrl("vercel-deploy"),
      {
        body: JSON.stringify({
          confirmationToken,
          missionId,
          projectName,
          target,
        }),
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: anonKey,
          "Content-Type": "application/json",
        },
        method: "POST",
      }
    );
    return new Response(response.body, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type":
          response.headers.get("content-type") ?? "application/json",
      },
      status: response.status,
    });
  } catch {
    return Response.json(
      { error: "Le service de déploiement Vercel est indisponible." },
      { headers: { "Cache-Control": "no-store" }, status: 502 }
    );
  }
}
