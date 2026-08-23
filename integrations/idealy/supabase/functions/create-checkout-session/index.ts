import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.7.0";

const appOrigin = Deno.env.get("APP_ORIGIN") ?? "";
const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": appOrigin || "*",
};

const PRICE_IDS = {
  business: {
    monthly:
      Deno.env.get("STRIPE_PRICE_ID_BUSINESS_MONTHLY") ??
      Deno.env.get("STRIPE_PRICE_ID_BUSINESS") ??
      "",
    yearly:
      Deno.env.get("STRIPE_PRICE_ID_BUSINESS_YEARLY") ??
      Deno.env.get("STRIPE_PRICE_ID_BUSINESS") ??
      "",
  },
  pro: {
    monthly:
      Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY") ??
      Deno.env.get("STRIPE_PRICE_ID_PRO") ??
      "",
    yearly:
      Deno.env.get("STRIPE_PRICE_ID_PRO_YEARLY") ??
      Deno.env.get("STRIPE_PRICE_ID_PRO") ??
      "",
  },
} as const;

type Plan = keyof typeof PRICE_IDS;
type BillingCycle = keyof typeof PRICE_IDS.pro;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authorization } } }
    );
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const plan = (body?.planId ?? body?.plan) as Plan;
    const billingCycle = body?.billingCycle as BillingCycle;
    if (plan !== "pro" && plan !== "business") {
      return json({ error: "Invalid plan" }, 400);
    }
    if (billingCycle !== "monthly" && billingCycle !== "yearly") {
      return json({ error: "Invalid billing cycle" }, 400);
    }
    const priceId = PRICE_IDS[plan][billingCycle];
    if (!priceId) {
      return json(
        {
          error:
            "Stripe price is not configured for this plan and billing cycle",
        },
        503
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-02-24.acacia",
    });
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, email, stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      throw profileError;
    }

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
      if (customerUpdateError) {
        throw customerUpdateError;
      }
    }

    const origin =
      appOrigin || req.headers.get("origin") || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      allow_promotion_codes: true,
      cancel_url: `${origin}/settings?billing=cancelled`,
      client_reference_id: user.id,
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      subscription_data: {
        metadata: { billing_cycle: billingCycle, plan, user_id: user.id },
        trial_period_days: 14,
      },
      success_url: `${origin}/settings?billing=success`,
    });

    return json({ url: session.url });
  } catch (error) {
    console.error("create-checkout-session failed", error);
    return json(
      { error: error instanceof Error ? error.message : "Checkout failed" },
      500
    );
  }
});
