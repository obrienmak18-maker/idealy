import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const appOrigin = Deno.env.get("APP_ORIGIN") ?? "";
const corsHeaders = {
  "Access-Control-Allow-Origin": appOrigin || "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PRICE_IDS = {
  pro: Deno.env.get("STRIPE_PRICE_ID_PRO") ?? "price_1U0iWlFEtyiGNczlURsFnwVh",
  business: Deno.env.get("STRIPE_PRICE_ID_BUSINESS") ?? "price_1U0iWsFEtyiGNczlz95WCoUz",
} as const;

type Plan = keyof typeof PRICE_IDS;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authorization } } },
    );
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const plan = body?.plan as Plan;
    if (plan !== "pro" && plan !== "business") return json({ error: "Invalid plan" }, 400);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-02-24.acacia",
    });
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, email, stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;

    let customerId = profile?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? profile?.email ?? undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;

      const { error: customerUpdateError } = await admin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
      if (customerUpdateError) throw customerUpdateError;
    }

    const origin = appOrigin || req.headers.get("origin") || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { user_id: user.id, plan },
      },
      allow_promotion_codes: true,
      success_url: `${origin}/settings?billing=success`,
      cancel_url: `${origin}/settings?billing=cancelled`,
    });

    return json({ url: session.url });
  } catch (error) {
    console.error("create-checkout-session failed", error);
    return json({ error: error instanceof Error ? error.message : "Checkout failed" }, 500);
  }
});
