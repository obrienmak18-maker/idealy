import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsResponse, optionsResponse } from "../_shared/cors.ts";

const appOrigin = Deno.env.get("APP_ORIGIN") ?? "";

const PRICE_IDS = {
  pro: {
    monthly: Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY") ?? Deno.env.get("STRIPE_PRICE_ID_PRO") ?? "",
    yearly: Deno.env.get("STRIPE_PRICE_ID_PRO_YEARLY") ?? Deno.env.get("STRIPE_PRICE_ID_PRO") ?? "",
  },
  business: {
    monthly: Deno.env.get("STRIPE_PRICE_ID_BUSINESS_MONTHLY") ?? Deno.env.get("STRIPE_PRICE_ID_BUSINESS") ?? "",
    yearly: Deno.env.get("STRIPE_PRICE_ID_BUSINESS_YEARLY") ?? Deno.env.get("STRIPE_PRICE_ID_BUSINESS") ?? "",
  },
} as const;

type Plan = keyof typeof PRICE_IDS;
type BillingCycle = keyof typeof PRICE_IDS.pro;

function json(body: unknown, status: number, req: Request) {
  return corsResponse(body, status, req);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse(req);
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, req);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401, req);
    if (!appOrigin) return json({ error: "Billing is temporarily unavailable" }, 503, req);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authorization } } },
    );
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401, req);

    const body = await req.json().catch(() => ({}));
    const plan = (body?.planId ?? body?.plan) as Plan;
    const billingCycle = body?.billingCycle as BillingCycle;
    if (plan !== "pro" && plan !== "business") return json({ error: "Invalid plan" }, 400, req);
    if (billingCycle !== "monthly" && billingCycle !== "yearly") return json({ error: "Invalid billing cycle" }, 400, req);
    const priceId = PRICE_IDS[plan][billingCycle];
    if (!priceId) return json({ error: "Billing is temporarily unavailable" }, 503, req);

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
    if (!profile) return json({ error: "Account setup is incomplete" }, 409, req);

    const { data: activeSubscription, error: activeSubscriptionError } = await admin
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "past_due"])
      .limit(1)
      .maybeSingle();
    if (activeSubscriptionError) throw activeSubscriptionError;
    if (activeSubscription)
      return json({ error: "An active subscription already exists" }, 409, req);

    let customerId = profile?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? profile?.email ?? undefined,
        metadata: { user_id: user.id },
      }, { idempotencyKey: `idealy:customer:${user.id}` });
      customerId = customer.id;

      const { error: customerUpdateError } = await admin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
      if (customerUpdateError) throw customerUpdateError;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { user_id: user.id, plan, billing_cycle: billingCycle },
      },
      allow_promotion_codes: true,
      success_url: `${appOrigin.replace(/\/$/, "")}/settings?billing=success`,
      cancel_url: `${appOrigin.replace(/\/$/, "")}/settings?billing=cancelled`,
    }, {
      idempotencyKey: `idealy:checkout:${user.id}:${plan}:${billingCycle}:${new Date().toISOString().slice(0, 10)}`,
    });

    return json({ url: session.url }, 200, req);
  } catch (error) {
    console.error("create-checkout-session failed", error);
    return json({ error: "Checkout could not be created" }, 500, req);
  }
});
