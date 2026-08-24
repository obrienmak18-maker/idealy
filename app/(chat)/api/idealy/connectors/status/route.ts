import { getToken } from "next-auth/jwt";
import { isDevelopmentEnvironment } from "@/lib/constants";

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function GET(request: Request) {
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

  const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) {
    return jsonError("Supabase server configuration is incomplete.", 503);
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/integration-status`,
      {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: anonKey,
          "x-client-info": "idealy-next-connectors",
        },
      }
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return jsonError(
        payload && typeof payload.error === "string"
          ? payload.error
          : "Unable to read connector status.",
        response.status
      );
    }

    return Response.json(payload, { status: 200 });
  } catch {
    return jsonError("Unable to reach the connector service.", 502);
  }
}
