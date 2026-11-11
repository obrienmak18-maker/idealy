import { getSafeToken } from "@/lib/auth/session-token";
import { getIdealySupabaseFunctionUrl } from "@/lib/idealy/config";

export async function GET(request: Request) {
  const token = await getSafeToken(request);
  const supabaseAccessToken = typeof token?.supabaseAccessToken === "string" ? token.supabaseAccessToken.trim() : "";
  const authorization = supabaseAccessToken ? `Bearer ${supabaseAccessToken}` : null;
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
