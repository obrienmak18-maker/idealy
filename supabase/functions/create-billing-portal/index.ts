import Stripe from "npm:stripe@17.7.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const appOrigin = Deno.env.get("APP_ORIGIN") ?? "";
const corsHeaders = {
  "Access-Control-Allow-Origin": appOrigin || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer "))
      return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !stripeSecret)
      return json({ error: "Billing server configuration is incomplete" }, 500);

    const authClient = createClient(supabaseUrl, anonKey);
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(authorization.slice("Bearer ".length));
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile?.stripe_customer_id)
      return json({ error: "No Stripe customer found" }, 404);

    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2025-02-24.acacia",
    });
    const origin =
      appOrigin || req.headers.get("origin") || "http://localhost:3000";
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/settings`,
    });

    return json({ url: session.url });
  } catch (error) {
    console.error("create-billing-portal failed", error);
    return json(
      {
        error: error instanceof Error ? error.message : "Billing portal failed",
      },
      500,
    );
  }
});
