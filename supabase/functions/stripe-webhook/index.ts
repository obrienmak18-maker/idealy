import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2025-02-24.acacia",
});

const PRICE_TO_PLAN: Record<string, "pro" | "business"> = {
  [Deno.env.get("STRIPE_PRICE_ID_PRO") ?? "price_1U0iWlFEtyiGNczlURsFnwVh"]: "pro",
  [Deno.env.get("STRIPE_PRICE_ID_BUSINESS") ?? "price_1U0iWsFEtyiGNczlz95WCoUz"]: "business",
};

function response(body: string, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/plain" } });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return response("Method not allowed", 405);

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) return response("Missing signature", 400);

    const event = await stripe.webhooks.constructEventAsync(
      await req.text(),
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
    );

    if (
      ![
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
      ].includes(event.type)
    ) {
      return response("ignored");
    }

    const subscription = event.data.object as Stripe.Subscription;
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;
    const priceId = subscription.items.data[0]?.price.id;
    const plan = PRICE_TO_PLAN[priceId] ?? "free";

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) return response("Unknown customer", 400);

    const { error: subscriptionError } = await admin.from("subscriptions").upsert(
      {
        user_id: profile.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId ?? null,
        status: subscription.status,
        plan,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
      },
      { onConflict: "stripe_subscription_id" },
    );
    if (subscriptionError) throw subscriptionError;

    const { error: profileUpdateError } = await admin
      .from("profiles")
      .update({ plan })
      .eq("id", profile.id);
    if (profileUpdateError) throw profileUpdateError;

    return response("ok");
  } catch (error) {
    console.error("stripe-webhook failed", error);
    return response(error instanceof Error ? error.message : "Webhook failed", 400);
  }
});
