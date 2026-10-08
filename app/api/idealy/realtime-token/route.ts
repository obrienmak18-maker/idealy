import { getToken } from "next-auth/jwt";
import { isDevelopmentEnvironment } from "@/lib/constants";

export async function GET(request: Request) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

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
