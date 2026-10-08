import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticate } from "../_shared/auth.ts";
import { corsResponse, optionsResponse } from "../_shared/cors.ts";
import { getVercelAccessToken } from "../_shared/vercelToken.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "GET" && request.method !== "POST") {
    return corsResponse({ error: "Method not allowed" }, 405, request);
  }

  const auth = await authenticate(request);
  if ("error" in auth) {
    return corsResponse({ error: auth.error }, auth.status, request);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return corsResponse({ error: "Vercel status is not configured." }, 503, request);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const credentials = await getVercelAccessToken(admin, auth.user.id);
    if (!credentials) {
      return corsResponse(
        {
          provider: "vercel",
          status: "disconnected",
          connected: false,
        },
        200,
        request,
      );
    }

    const response = await fetch("https://api.vercel.com/v2/user", {
      headers: {
        Authorization: `Bearer ${credentials.token}`,
        Accept: "application/json",
      },
    });

    const payload = (await response.json().catch(() => null)) as {
      user?: {
        uid?: string;
        username?: string;
        name?: string;
        email?: string;
        avatar?: string;
      };
      error?: { message?: string };
    } | null;

    if (!response.ok) {
      await admin
        .from("user_integrations")
        .update({ status: response.status === 401 ? "expired" : "error", updated_at: new Date().toISOString() })
        .eq("id", credentials.integrationId)
        .eq("user_id", auth.user.id);
      return corsResponse(
        {
          provider: "vercel",
          status: response.status === 401 ? "expired" : "error",
          connected: false,
          error: payload?.error?.message ?? "Vercel authorization could not be verified.",
        },
        response.status === 401 ? 401 : 503,
        request,
      );
    }

    await admin
      .from("user_integrations")
      .update({
        status: "active",
        last_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        display_name:
          payload?.user?.username ??
          payload?.user?.name ??
          payload?.user?.email ??
          "Vercel",
      })
      .eq("id", credentials.integrationId)
      .eq("user_id", auth.user.id);

    return corsResponse(
      {
        provider: "vercel",
        status: "active",
        connected: true,
        displayName:
          payload?.user?.username ??
          payload?.user?.name ??
          payload?.user?.email ??
          "Vercel",
        accountId: payload?.user?.uid ?? null,
      },
      200,
      request,
    );
  } catch (error) {
    console.error("vercel-status failed", error);
    return corsResponse(
      { provider: "vercel", status: "error", connected: false },
      503,
      request,
    );
  }
});
