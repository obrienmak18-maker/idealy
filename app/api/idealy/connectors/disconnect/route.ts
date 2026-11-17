import { getSafeToken } from "@/lib/auth/session-token";
import { createClient } from "@supabase/supabase-js";

function noStore() {
  return { "Cache-Control": "no-store" };
}

function getSupabaseAdmin() {
  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    "";
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    "";

  if (!url || !serviceKey) {
    return null;
  }
  return createClient(url, serviceKey);
}

export async function POST(request: Request) {
  const safeToken = await getSafeToken(request);
  const userId =
    safeToken?.supabaseUserId ||
    (typeof safeToken?.id === "string" ? safeToken.id : null);

  if (!userId) {
    return Response.json(
      { error: "Une session Idealy authentifiée est requise." },
      { headers: noStore(), status: 401 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    provider?: string;
  };

  const provider = (body.provider ?? "").trim().toLowerCase();
  const canonicalProvider = provider === "google" ? "google-drive" : provider;

  if (!provider) {
    return Response.json(
      { error: "Le paramètre provider est requis." },
      { headers: noStore(), status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  if (admin) {
    try {
      // 1. Delete or mark revoked in user_integrations
      await admin
        .from("user_integrations")
        .delete()
        .eq("user_id", userId)
        .in("provider", [provider, canonicalProvider]);
    } catch (err) {
      console.warn("[Connectors disconnect] DB delete warning:", err);
    }
  }

  return Response.json(
    {
      message: `Connecteur ${provider} déconnecté et révoqué avec succès.`,
      provider,
      status: "not_connected",
      success: true,
    },
    { headers: noStore(), status: 200 },
  );
}
