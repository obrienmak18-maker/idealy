import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticate } from "../_shared/auth.ts";
import { corsResponse, optionsResponse } from "../_shared/cors.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST" && request.method !== "GET")
    return corsResponse({ error: "Method not allowed" }, 405, request);

  const auth = await authenticate(request);
  if ("error" in auth)
    return corsResponse({ error: auth.error }, auth.status, request);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const { data, error } = await admin
    .from("integrations")
    .select("provider, metadata, updated_at")
    .eq("user_id", auth.user.id);
  if (error) {
    console.error("integration-status failed", error.message);
    return corsResponse(
      { error: "Unable to read connector status." },
      500,
      request,
    );
  }

  return corsResponse({
    integrations: (data ?? []).map(
      (integration: {
        provider: string;
        metadata?: Record<string, unknown>;
        updated_at?: string;
      }) => ({
        provider: integration.provider,
        connectedAt:
          integration.metadata?.connected_at ?? integration.updated_at ?? null,
      }),
    ),
  });
});
