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
      // 1. Identify existing integration records
      const { data: existing, error: selectError } = await admin
        .from("user_integrations")
        .select("id")
        .eq("user_id", userId)
        .in("provider", [provider, canonicalProvider]);

      if (selectError) {
        console.error(
          "[Connectors disconnect] Select error:",
          selectError.message,
        );
      }

      if (existing && existing.length > 0) {
        const ids = existing.map((row) => row.id);

        // 2. Explicitly remove integration credentials (defense in depth)
        const { error: credDeleteError } = await admin
          .from("integration_credentials")
          .delete()
          .in("integration_id", ids);

        if (credDeleteError) {
          console.warn(
            "[Connectors disconnect] Credentials delete warning:",
            credDeleteError.message,
          );
        }

        // 3. Delete user integration record
        const { error: delError } = await admin
          .from("user_integrations")
          .delete()
          .in("id", ids);

        if (delError) {
          console.error(
            "[Connectors disconnect] DB delete error:",
            delError.message,
          );
          return Response.json(
            {
              error: `Échec de la suppression de l'intégration : ${delError.message}`,
            },
            { headers: noStore(), status: 500 },
          );
        }
      }
    } catch (err) {
      console.error("[Connectors disconnect] DB delete exception:", err);
      return Response.json(
        {
          error:
            "Une erreur est survenue lors de la suppression des identifiants.",
        },
        { headers: noStore(), status: 500 },
      );
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
