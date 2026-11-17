import { getSafeToken } from "@/lib/auth/session-token";
import { encryptConnectorToken } from "@/lib/security/connector-encryption";
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

  // 2. Real cryptographic encryption (AES-256-GCM)
  const encrypted = encryptConnectorToken(rawToken);

  // 3. Persist in database under user_integrations & integration_credentials
  const admin = getSupabaseAdmin();
  if (!admin) {
    return Response.json(
      {
        error:
          "Le service de stockage sécurisé des intégrations n'est pas configuré sur ce serveur.",
      },
      { headers: noStore(), status: 503 },
    );
  }

  try {
    const { data: integration, error: dbError } = await admin
      .from("user_integrations")
      .upsert(
        {
          connection_type: "api_key",
          credential_reference: `encrypted:${provider}`,
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
      )
      .select("id")
      .single();

    if (dbError || !integration) {
      console.error(
        "[Connectors credentials] Supabase user_integrations upsert error:",
        dbError?.message,
      );
      return Response.json(
        {
          error: `Échec de l'enregistrement de l'intégration : ${dbError?.message || "erreur base de données"}`,
        },
        { headers: noStore(), status: 500 },
      );
    }

    const { error: credError } = await admin
      .from("integration_credentials")
      .upsert(
        {
          algorithm: encrypted.algorithm,
          ciphertext: encrypted.ciphertext,
          integration_id: integration.id,
          iv: encrypted.iv,
          key_version: 1,
          rotated_at: new Date().toISOString(),
        },
        { onConflict: "integration_id" },
      );

    if (credError) {
      console.error(
        "[Connectors credentials] Supabase integration_credentials error:",
        credError.message,
      );
      await admin
        .from("user_integrations")
        .update({ status: "error" })
        .eq("id", integration.id);
      return Response.json(
        {
          error: `Échec du stockage chiffré des identifiants : ${credError.message}`,
        },
        { headers: noStore(), status: 500 },
      );
    }
  } catch (e) {
    console.error("[Connectors credentials] Critical DB write failure:", e);
    return Response.json(
      {
        error:
          "Une erreur critique est survenue lors de l'enregistrement sécurisé.",
      },
      { headers: noStore(), status: 500 },
    );
  }

  return Response.json(
    {
      displayName,
      message: `Connecteur ${provider} configuré, chiffré et vérifié avec succès.`,
      provider,
      status: "connected",
      success: true,
    },
    { headers: noStore(), status: 200 },
  );
}
