import { getToken } from "next-auth/jwt";
import { getIdealySupabaseFunctionUrl } from "@/lib/idealy/config";
import { isDevelopmentEnvironment } from "@/lib/constants";

export async function POST(request: Request) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });
  const explicitAuthorization = request.headers.get("authorization");
  const supabaseAccessToken = typeof token?.supabaseAccessToken === "string"
    ? token.supabaseAccessToken
    : null;
  const authorization = explicitAuthorization ?? (supabaseAccessToken ? `Bearer ${supabaseAccessToken}` : null);
  if (!authorization?.startsWith("Bearer ")) {
    return Response.json({ error: "Une session Idealy authentifiée est requise." }, { status: 401 });
  }

  try {
    const response = await fetch(getIdealySupabaseFunctionUrl("create-billing-portal"), {
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
        ...(process.env.SUPABASE_ANON_KEY ? { apikey: process.env.SUPABASE_ANON_KEY } : {}),
        "x-client-info": "idealy-next-billing",
      },
      method: "POST",
    });
    return new Response(response.body, {
      headers: { "Cache-Control": "no-store", "Content-Type": response.headers.get("content-type") ?? "application/json" },
      status: response.status,
    });
  } catch {
    return Response.json({ error: "Le portail de facturation est indisponible." }, { status: 502 });
  }
}
