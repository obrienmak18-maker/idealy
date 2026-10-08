import { getToken } from "next-auth/jwt";
import { isDevelopmentEnvironment } from "@/lib/constants";

const SUPPORTED_OAUTH_PROVIDERS = new Set([
  "github",
  "canva",
  "figma",
  "google-drive",
  "notion",
  "slack",
  "vercel",
]);

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });
  const accessToken =
    typeof token?.supabaseAccessToken === "string"
      ? token.supabaseAccessToken
      : null;

  if (!accessToken) return jsonError("Supabase session required.", 401);

  const body = (await request.json().catch(() => null)) as {
    provider?: unknown;
  } | null;
  const provider =
    typeof body?.provider === "string"
      ? body.provider.trim().toLowerCase()
      : "";

  if (!SUPPORTED_OAUTH_PROVIDERS.has(provider)) {
    return jsonError("Unsupported or non-OAuth connector.", 400);
  }

  const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) {
    return jsonError("Supabase server configuration is incomplete.", 503);
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/integration-connect`,
      {
        body: JSON.stringify({ provider }),
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: anonKey,
          "Content-Type": "application/json",
          "x-client-info": "idealy-next-connectors",
        },
        method: "POST",
      },
    );
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return jsonError(
        payload && typeof payload.error === "string"
          ? payload.error
          : "Unable to start connector connection.",
        response.status,
      );
    }

    return Response.json(payload, { status: 200 });
  } catch {
    return jsonError("Unable to reach the connector service.", 502);
  }
}
