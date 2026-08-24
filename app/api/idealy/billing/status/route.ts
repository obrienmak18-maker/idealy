import { getToken } from "next-auth/jwt";
import { getIdealySupabaseFunctionUrl } from "@/lib/idealy/config";
import { isDevelopmentEnvironment } from "@/lib/constants";

function getAuthorization(request: Request, token: Awaited<ReturnType<typeof getToken>>) {
  const explicitAuthorization = request.headers.get("authorization");
  const supabaseAccessToken = typeof token === "object" && token !== null && typeof token.supabaseAccessToken === "string"
    ? token.supabaseAccessToken
    : null;
  return explicitAuthorization ?? (supabaseAccessToken ? `Bearer ${supabaseAccessToken}` : null);
}

export async function GET(request: Request) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });
  const authorization = getAuthorization(request, token);
  if (!authorization?.startsWith("Bearer ")) {
    return Response.json({ error: "Une session Idealy authentifiée est requise." }, { status: 401 });
  }

  try {
    const response = await fetch(getIdealySupabaseFunctionUrl("check-subscription"), {
      headers: {
        Authorization: authorization,
        ...(process.env.SUPABASE_ANON_KEY ? { apikey: process.env.SUPABASE_ANON_KEY } : {}),
        "x-client-info": "idealy-next-billing",
      },
      method: "GET",
    });
    return new Response(response.body, {
      headers: { "Cache-Control": "no-store", "Content-Type": response.headers.get("content-type") ?? "application/json" },
      status: response.status,
    });
  } catch {
    return Response.json({ error: "Le statut de facturation est indisponible." }, { status: 502 });
  }
}
