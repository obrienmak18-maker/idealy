import { getSafeToken } from "@/lib/auth/session-token";

export async function GET(request: Request) {
  const token = await getSafeToken(request);

  const accessToken =
    typeof token?.supabaseAccessToken === "string"
      ? token.supabaseAccessToken.trim()
      : "";

  if (!accessToken) {
    return Response.json(
      { error: "Une session Supabase authentifiée est requise." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(
    { accessToken },
    { headers: { "Cache-Control": "no-store" } },
  );
}
