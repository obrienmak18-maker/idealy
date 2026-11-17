import { getSafeToken } from "@/lib/auth/session-token";
import { getIdealySupabaseFunctionUrl } from "@/lib/idealy/config";
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

export async function GET(request: Request) {
  const token = await getSafeToken(request);
  const userId =
    token?.supabaseUserId ||
    (typeof token?.id === "string" ? token.id : null);

  const accessToken =
    typeof token?.supabaseAccessToken === "string"
      ? token.supabaseAccessToken
      : null;

  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();

  // Try Edge Function if accessToken is present
  if (accessToken && anonKey) {
    try {
      const response = await fetch(
        getIdealySupabaseFunctionUrl("integration-status"),
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            apikey: anonKey,
          },
          method: "GET",
        },
      );

      if (response.ok) {
        const payload = await response.json().catch(() => null);
        if (payload) {
          return Response.json(payload, {
            headers: noStore(),
            status: 200,
          });
        }
      }
    } catch {
      // Fallback to direct DB query below
    }
  }

  // Fallback: direct Supabase query when authenticated
  if (userId) {
    const admin = getSupabaseAdmin();
    if (admin) {
      try {
        const { data, error } = await admin
          .from("user_integrations")
          .select(
            "provider, display_name, status, last_verified_at, expires_at, updated_at, metadata",
          )
          .eq("user_id", userId)
          .order("updated_at", { ascending: false });

        if (!error && data) {
          return Response.json(
            {
              integrations: data.map((item) => ({
                displayName: item.display_name,
                expiresAt: item.expires_at,
                lastVerifiedAt: item.last_verified_at,
                metadata: item.metadata,
                provider: item.provider,
                status: item.status,
                updatedAt: item.updated_at,
              })),
            },
            { headers: noStore(), status: 200 },
          );
        }
      } catch {
        // Continue to error return
      }
    }
  }

  if (!userId && !accessToken) {
    return Response.json(
      { error: "Une session Idealy authentifiée est requise." },
      { headers: noStore(), status: 401 },
    );
  }

  return Response.json(
    { error: "Le statut des connecteurs est momentanément indisponible." },
    { headers: noStore(), status: 503 },
  );
}
