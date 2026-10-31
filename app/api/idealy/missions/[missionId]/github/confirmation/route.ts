import { getToken } from "next-auth/jwt";
import { auth } from "@/app/(auth)/auth";
import { isDevelopmentEnvironment } from "@/lib/constants";
import { getIdealySupabaseFunctionUrl } from "@/lib/idealy/config";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN = /^[a-zA-Z0-9_-]{32,180}$/;

async function handleConfirmation(
  request: Request,
  context: { params: Promise<{ missionId: string }> },
  method: "POST" | "PATCH"
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

  const { missionId } = await context.params;
  if (!UUID_PATTERN.test(missionId)) {
    return Response.json({ error: "Invalid mission id" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as {
    confirmationToken?: unknown;
    operation?: unknown;
    payloadDigest?: unknown;
  } | null;
  const confirmationToken =
    typeof body?.confirmationToken === "string" ? body.confirmationToken : "";
  const operation =
    typeof body?.operation === "string" ? body.operation : "github:export";
  if (
    !TOKEN_PATTERN.test(confirmationToken) ||
    operation !== "github:export" ||
    (method === "POST" &&
      (typeof body?.payloadDigest !== "string" ||
        !/^[a-f0-9]{64}$/i.test(body.payloadDigest)))
  ) {
    return Response.json(
      { error: "Les paramètres de confirmation GitHub sont invalides." },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      getIdealySupabaseFunctionUrl("mission-action-confirmation"),
      {
        body: JSON.stringify({
          confirmationToken,
          missionId,
          operation,
          ...(method === "POST" ? { payloadDigest: body?.payloadDigest } : {}),
        }),
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: anonKey,
          "Content-Type": "application/json",
        },
        method,
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
      { error: "Le service de confirmation GitHub est indisponible." },
      { headers: { "Cache-Control": "no-store" }, status: 502 }
    );
  }
}

export function POST(
  request: Request,
  context: { params: Promise<{ missionId: string }> }
) {
  return handleConfirmation(request, context, "POST");
}

export function PATCH(
  request: Request,
  context: { params: Promise<{ missionId: string }> }
) {
  return handleConfirmation(request, context, "PATCH");
}
