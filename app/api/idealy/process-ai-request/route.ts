import { getToken } from "next-auth/jwt";
import { getIdealyAiFunctionUrl } from "@/lib/idealy/config";
import { isDevelopmentEnvironment } from "@/lib/constants";

export async function POST(request: Request) {
  const explicitAuthorization = request.headers.get("authorization");
  const token = explicitAuthorization
    ? null
    : await getToken({
        req: request,
        secret: process.env.AUTH_SECRET,
        secureCookie: !isDevelopmentEnvironment,
      });
  const supabaseAccessToken =
    typeof token?.supabaseAccessToken === "string"
      ? token.supabaseAccessToken
      : null;
  const authorization =
    explicitAuthorization ??
    (supabaseAccessToken ? `Bearer ${supabaseAccessToken}` : null);

  if (!authorization?.startsWith("Bearer ")) {
    return Response.json(
      { error: "Une session Idealy authentifiée est requise." },
      { status: 401 }
    );
  }

  try {
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim();
    const clientApiKey = request.headers.get("apikey")?.trim();
    const response = await fetch(getIdealyAiFunctionUrl(), {
      body: await request.text(),
      headers: {
        Authorization: authorization,
        "Content-Type":
          request.headers.get("content-type") ?? "application/json",
        ...(clientApiKey || supabaseAnonKey
          ? { apikey: clientApiKey ?? supabaseAnonKey }
          : {}),
        "x-client-info": "idealy-next-workspace",
      },
      method: "POST",
    });

    return new Response(response.body, {
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type":
          response.headers.get("content-type") ?? "application/json",
      },
      status: response.status,
    });
  } catch (error) {
    console.error("Idealy AI proxy failed", error);
    return Response.json(
      { error: "Le backend Idealy est momentanément indisponible." },
      { status: 502 }
    );
  }
}
