import { getToken } from "next-auth/jwt";
import { isDevelopmentEnvironment } from "@/lib/constants";
import { getIdealySupabaseFunctionUrl } from "@/lib/idealy/config";

const allowedProviders = new Set([
  "github",
  "canva",
  "figma",
  "google-drive",
  "notion",
  "slack",
]);

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
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();

  if (!accessToken || !anonKey) {
    return Response.json(
      { error: "Une session Idealy authentifiée est requise." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const body = await request.json().catch(() => null) as { provider?: unknown } | null;
  const requestedProvider =
    typeof body?.provider === "string" ? body.provider.trim().toLowerCase() : "";
  // The catalog uses "google" while the OAuth Edge Function's provider
  // contract is "google-drive". Normalize the alias at this boundary.
  const provider =
    requestedProvider === "google" ? "google-drive" : requestedProvider;

  if (!allowedProviders.has(provider)) {
    return Response.json(
      { error: "Ce connecteur OAuth n'est pas disponible." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const returnOrigin = new URL(request.url).origin;
  const suppliedOrigin = request.headers.get("origin");
  if (suppliedOrigin && suppliedOrigin !== returnOrigin) {
    return Response.json(
      { error: "L’origine de cette demande n’est pas autorisée." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const response = await fetch(getIdealySupabaseFunctionUrl("integration-connect"), {
    method: "POST",
    headers: {
      Authorization: "Bearer " + accessToken,
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ provider, returnOrigin }),
    cache: "no-store",
  }).catch(() => null);

  const payload = await response?.json().catch(() => null);
  if (!response?.ok) {
    return Response.json(
      { error: payload?.error ?? "Connexion indisponible." },
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
