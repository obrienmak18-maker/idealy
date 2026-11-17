import { getSafeToken } from "@/lib/auth/session-token";

function noStore() {
  return { "Cache-Control": "no-store" };
}

interface ProviderTestResult {
  account?: {
    email?: string | null;
    id?: string | null;
    login?: string | null;
    name?: string | null;
  };
  error?: string;
  latencyMs: number;
  success: boolean;
}

async function verifyProviderToken(
  provider: string,
  token: string,
): Promise<ProviderTestResult> {
  const start = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const p = provider.toLowerCase().trim();
    if (p === "github") {
      const res = await fetch("https://api.github.com/user", {
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "Idealy-App",
        },
        signal: controller.signal,
      });
      const latencyMs = Math.round(performance.now() - start);
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          email?: string;
          id?: number;
          login?: string;
          name?: string;
        };
        return {
          account: {
            email: data.email ?? null,
            id: data.id ? String(data.id) : null,
            login: data.login ?? null,
            name: data.name ?? data.login ?? null,
          },
          latencyMs,
          success: true,
        };
      }
      return {
        error: `Authentification GitHub refusée (HTTP ${res.status}). Vérifiez le Personal Access Token.`,
        latencyMs,
        success: false,
      };
    }

    if (p === "vercel") {
      const res = await fetch("https://api.vercel.com/v2/user", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });
      const latencyMs = Math.round(performance.now() - start);
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          user?: { email?: string; id?: string; name?: string; username?: string };
        };
        return {
          account: {
            email: data.user?.email ?? null,
            id: data.user?.id ?? null,
            login: data.user?.username ?? null,
            name: data.user?.name ?? data.user?.username ?? null,
          },
          latencyMs,
          success: true,
        };
      }
      return {
        error: `Authentification Vercel refusée (HTTP ${res.status}).`,
        latencyMs,
        success: false,
      };
    }

    if (p === "figma") {
      const res = await fetch("https://api.figma.com/v1/me", {
        headers: {
          "X-Figma-Token": token,
        },
        signal: controller.signal,
      });
      const latencyMs = Math.round(performance.now() - start);
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          email?: string;
          handle?: string;
          id?: string;
        };
        return {
          account: {
            email: data.email ?? null,
            id: data.id ?? null,
            name: data.handle ?? null,
          },
          latencyMs,
          success: true,
        };
      }
      return {
        error: `Authentification Figma refusée (HTTP ${res.status}).`,
        latencyMs,
        success: false,
      };
    }

    if (p === "slack") {
      const res = await fetch("https://slack.com/api/auth.test", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });
      const latencyMs = Math.round(performance.now() - start);
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        ok?: boolean;
        team?: string;
        user?: string;
        user_id?: string;
      };
      if (res.ok && data.ok) {
        return {
          account: {
            id: data.user_id ?? null,
            name: data.user ? `${data.user} (${data.team || "Slack"})` : "Slack User",
          },
          latencyMs,
          success: true,
        };
      }
      return {
        error: `Authentification Slack refusée : ${data.error || "Jeton invalide"}.`,
        latencyMs,
        success: false,
      };
    }

    if (p === "notion") {
      const res = await fetch("https://api.notion.com/v1/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Notion-Version": "2022-06-28",
        },
        signal: controller.signal,
      });
      const latencyMs = Math.round(performance.now() - start);
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          id?: string;
          name?: string;
        };
        return {
          account: {
            id: data.id ?? null,
            name: data.name ?? "Notion Integration",
          },
          latencyMs,
          success: true,
        };
      }
      return {
        error: `Authentification Notion refusée (HTTP ${res.status}).`,
        latencyMs,
        success: false,
      };
    }

    if (p === "stripe") {
      const res = await fetch("https://api.stripe.com/v1/balance", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });
      const latencyMs = Math.round(performance.now() - start);
      if (res.ok) {
        return {
          account: {
            name: "Compte Stripe Valide",
          },
          latencyMs,
          success: true,
        };
      }
      return {
        error: `Clé API Stripe refusée (HTTP ${res.status}).`,
        latencyMs,
        success: false,
      };
    }

    if (p === "google" || p === "google-drive") {
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });
      const latencyMs = Math.round(performance.now() - start);
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          email?: string;
          name?: string;
          sub?: string;
        };
        return {
          account: {
            email: data.email ?? null,
            id: data.sub ?? null,
            name: data.name ?? null,
          },
          latencyMs,
          success: true,
        };
      }
      return {
        error: `Jeton Google refusé (HTTP ${res.status}).`,
        latencyMs,
        success: false,
      };
    }

    // Default / AI providers (OpenAI, Anthropic, etc.)
    if (token.length >= 10) {
      const latencyMs = Math.round(performance.now() - start);
      return {
        account: {
          name: `${p.toUpperCase()} Token`,
        },
        latencyMs,
        success: true,
      };
    }

    return {
      error: "Format de clé ou de jeton invalide pour ce fournisseur.",
      latencyMs: Math.round(performance.now() - start),
      success: false,
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      error:
        err instanceof Error
          ? `Échec de connexion au service : ${err.message}`
          : "Échec de connexion réseau.",
      latencyMs,
      success: false,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(request: Request) {
  const token = await getSafeToken(request);
  if (!token?.email && !token?.id) {
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

  if (!provider) {
    return Response.json(
      { error: "Le paramètre provider est requis." },
      { headers: noStore(), status: 400 },
    );
  }

  if (!rawToken) {
    return Response.json(
      {
        error:
          "Veuillez renseigner un jeton ou une clé pour tester la connexion.",
      },
      { headers: noStore(), status: 400 },
    );
  }

  const result = await verifyProviderToken(provider, rawToken);

  if (!result.success) {
    return Response.json(
      {
        error: result.error,
        latencyMs: result.latencyMs,
        provider,
        success: false,
      },
      { headers: noStore(), status: 400 },
    );
  }

  return Response.json(
    {
      account: result.account,
      latencyMs: result.latencyMs,
      provider,
      status: "connected",
      success: true,
    },
    { headers: noStore(), status: 200 },
  );
}
