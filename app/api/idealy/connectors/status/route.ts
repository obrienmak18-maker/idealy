import { getToken } from "next-auth/jwt";
import { isDevelopmentEnvironment } from "@/lib/constants";
import { getIdealySupabaseFunctionUrl } from "@/lib/idealy/config";

function noStore() {
  return { "Cache-Control": "no-store" };
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

  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();

  if (!accessToken || !anonKey) {
    return Response.json(
      { error: "Une session Idealy authentifiée est requise." },
      { headers: noStore(), status: 401 },
    );
  }

  const response = await fetch(getIdealySupabaseFunctionUrl("integration-status"), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    method: "GET",
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    return Response.json(
      { error: "Le statut des connecteurs est momentanément indisponible." },
      { headers: noStore(), status: 503 },
    );
  }

  const payload = await response.json().catch(() => null);
  return Response.json(payload ?? { integrations: [] }, {
    headers: noStore(),
    status: 200,
  });
}
