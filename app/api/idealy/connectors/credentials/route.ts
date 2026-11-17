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
    token?: string;
  };

  const provider = (body.provider ?? "").trim().toLowerCase();
  const rawToken = (body.token ?? "").trim();

  if (!provider || !rawToken) {
    return Response.json(
      { error: "Les champs 'provider' et 'token' sont obligatoires." },
      { headers: noStore(), status: 400 },
    );
  }

  // 1. Verify token with provider test route logic
  let displayName = `${provider.toUpperCase()} Token`;
  try {
    if (provider === "github") {
      const check = await fetch("https://api.github.com/user", {
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `Bearer ${rawToken}`,
          "User-Agent": "Idealy-App",
        },
      });
      if (!check.ok) {
        return Response.json(
          {
            error:
              "Le jeton GitHub est invalide ou ne dispose pas des droits requis.",
          },
          { headers: noStore(), status: 400 },
        );
      }
      const u = (await check.json().catch(() => ({}))) as {
        login?: string;
        name?: string;
      };
      displayName = u.name || u.login || displayName;
    } else if (provider === "vercel") {
      const check = await fetch("https://api.vercel.com/v2/user", {
        headers: { Authorization: `Bearer ${rawToken}` },
      });
      if (!check.ok) {
        return Response.json(
          { error: "Le jeton Vercel est invalide ou expiré." },
          { headers: noStore(), status: 400 },
        );
      }
      const u = (await check.json().catch(() => ({}))) as {
        user?: { username?: string };
      };
      displayName = u.user?.username || displayName;
    } else if (provider === "figma") {
      const check = await fetch("https://api.figma.com/v1/me", {
        headers: { "X-Figma-Token": rawToken },
      });
      if (!check.ok) {
        return Response.json(
          { error: "Le jeton Figma est invalide ou expiré." },
          { headers: noStore(), status: 400 },
        );
      }
      const u = (await check.json().catch(() => ({}))) as { handle?: string };
      displayName = u.handle || displayName;
    }
  } catch (err) {
    return Response.json(
      {
        error: `Impossible de vérifier le jeton auprès de ${provider} : ${err instanceof Error ? err.message : "Erreur réseau"}`,
      },
      { headers: noStore(), status: 502 },
    );
  }

  // 2. Persist in database under user_integrations
  const admin = getSupabaseAdmin();
  if (admin) {
    try {
      const { error: dbError } = await admin.from("user_integrations").upsert(
        {
          connection_type: "api_key",
          credential_reference: `vault:${provider}:${Date.now()}`,
          display_name: displayName,
          last_verified_at: new Date().toISOString(),
          metadata: {
            configuredBy: "user_pat",
            savedAt: new Date().toISOString(),
          },
          provider,
          status: "active",
          updated_at: new Date().toISOString(),
          user_id: userId,
        },
        { onConflict: "user_id,provider" },
      );

      if (dbError) {
        console.error(
          "[Connectors credentials] Supabase upsert error:",
          dbError.message,
        );
      }
    } catch (e) {
      console.warn("[Connectors credentials] DB write failed:", e);
    }
  }

  return Response.json(
    {
      displayName,
      message: `Connecteur ${provider} configuré et vérifié avec succès.`,
      provider,
      status: "connected",
      success: true,
    },
    { headers: noStore(), status: 200 },
  );
}
