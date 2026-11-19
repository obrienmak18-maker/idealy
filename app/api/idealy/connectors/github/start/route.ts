import { getSafeToken } from "@/lib/auth/session-token";
import { isDevelopmentEnvironment } from "@/lib/constants";
import { getIdealySupabaseFunctionUrl } from "@/lib/idealy/config";

export async function POST(request: Request) {
  const token = await getSafeToken(request);

  const accessToken =
    typeof token?.supabaseAccessToken === "string"
      ? token.supabaseAccessToken
      : null;
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();

  if (!accessToken || !anonKey) {
    return Response.json(
      { error: "An authenticated Idealy session is required." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const response = await fetch(
    getIdealySupabaseFunctionUrl("integration-connect"),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
      cache: "no-store",
    },
  ).catch(() => null);

  const payload = await response?.json().catch(() => null);

  if (!response?.ok) {
    return Response.json(
      {
        error:
          payload?.error ??
          "GitHub connection is temporarily unavailable.",
      },
      {
        status: response?.status ?? 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  return Response.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
