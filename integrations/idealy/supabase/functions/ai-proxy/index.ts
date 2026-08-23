const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "*",
};

/**
 * Compatibility guard for the retired proxy. All clients must use
 * process-ai-request, which owns auth, intent routing, BYOK resolution and
 * managed-credit accounting.
 */
Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return new Response(
    JSON.stringify({
      error: "This AI proxy is retired.",
      replacement: "process-ai-request",
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 410,
    }
  );
});
