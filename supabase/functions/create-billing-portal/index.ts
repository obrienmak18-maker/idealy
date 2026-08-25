import Stripe from "npm:stripe@17.7.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsResponse, optionsResponse } from "../_shared/cors.ts";

const appOrigin = Deno.env.get("APP_ORIGIN") ?? "";

function json(body: unknown, status: number, req: Request) {
  return corsResponse(body, status, req);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse(req);
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, req);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer "))
      return json({ error: "Unauthorized" }, 401, req);
    if (!appOrigin)
      return json({ error: "Billing is temporarily unavailable" }, 503, req);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !stripeSecret)
      return json({ error: "Billing is temporarily unavailable" }, 503, req);

    const authClient = createClient(supabaseUrl, anonKey);
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(authorization.slice("Bearer ".length));
    if (authError || !user) return json({ error: "Unauthorized" }, 401, req);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile?.stripe_customer_id)
      return json({ error: "Billing profile not found" }, 404, req);

    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2025-02-24.acacia",
    });
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appOrigin.replace(/\/$/, "")}/settings`,
    });

    return json({ url: session.url }, 200, req);
  } catch (error) {
    console.error("create-billing-portal failed", error);
    return json(
      {
        error: "Billing portal could not be opened",
      },
      500,
      req,
    );
  }
});
