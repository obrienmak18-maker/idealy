import Stripe from "npm:stripe@17.7.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
type CreditPackCatalog = Record<string, number>;

type PowerPack = {
  points: number;
  powerPoints: number;
};

type PowerPackPurchase = {
  eventId: string;
  packId: string;
  powerPoints: number;
  userId: string;
};

type CheckoutSessionCompletedEvent = {
  id: string;
};

type CheckoutSession = Stripe.Checkout.Session;

function positiveInteger(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 100_000) return null;
  return parsed;
}

function parseCreditPackCatalog(value: string | undefined): CreditPackCatalog {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).flatMap(([packId, credits]) => {
        const amount = positiveInteger(credits);
        return packId.trim() && amount ? [[packId.trim(), amount]] : [];
      }),
    );
  } catch {
    return {};
  }
}

function getCreditRefillFromCheckout(
  event: CheckoutSessionCompletedEvent,
  session: CheckoutSession,
  creditPackCatalog: CreditPackCatalog,
) {
  if (session.mode !== "payment") return null;
  const userId = session.metadata?.user_id?.trim();
  const packId = session.metadata?.credit_pack_id?.trim();
  const amount = packId ? positiveInteger(creditPackCatalog[packId]) : null;
  if (!userId || !amount) return null;

  return {
    amount,
    eventId: event.id,
    packId,
    reason: `stripe:checkout.session.completed:${session.mode ?? "payment"}`,
    sessionId: session.id,
    userId,
  };
}

function parsePowerPackCatalog(value: string | undefined): Record<string, PowerPack> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).flatMap(([packId, pack]) => {
        if (!packId.trim() || !pack || typeof pack !== "object") return [];
        const entry = pack as Record<string, unknown>;
        const powerPoints = positiveInteger(entry.powerPoints);
        return powerPoints
          ? [[packId.trim(), { points: 1, powerPoints }]]
          : [];
      }),
    );
  } catch {
    return {};
  }
}

function getPowerPackFromCheckout(
  event: CheckoutSessionCompletedEvent,
  session: CheckoutSession,
  catalog: Record<string, PowerPack>,
): PowerPackPurchase | null {
  if (session.mode !== "payment") return null;

  const userId = session.metadata?.user_id?.trim();
  const packId = session.metadata?.power_pack_id?.trim();
  if (!userId || !packId) return null;

  const pack = catalog[packId];
  if (!pack) return null;

  const powerPoints = positiveInteger(pack.powerPoints);
  if (!powerPoints) return null;

  return {
    eventId: event.id,
    packId,
    powerPoints,
    userId,
  };
}

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2025-02-24.acacia",
});

const PRICE_TO_PLAN: Record<string, "pro" | "business"> = Object.fromEntries(
  [
    [Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY"), "pro"],
    [Deno.env.get("STRIPE_PRICE_ID_PRO_YEARLY"), "pro"],
    [Deno.env.get("STRIPE_PRICE_ID_BUSINESS_MONTHLY"), "business"],
    [Deno.env.get("STRIPE_PRICE_ID_BUSINESS_YEARLY"), "business"],
    [Deno.env.get("STRIPE_PRICE_ID_PRO"), "pro"],
    [Deno.env.get("STRIPE_PRICE_ID_BUSINESS"), "business"],
  ].filter(([priceId]) => typeof priceId === "string" && priceId.length > 0),
) as Record<string, "pro" | "business">;

const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);

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

    if (!SUBSCRIPTION_EVENTS.has(event.type) && event.type !== "checkout.session.completed") {
      return response("ignored");
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Power Pack purchases credit the Power wallet, which is the balance
      // missions actually spend from. A purchase that never reaches the wallet
      // would leave the user having paid for nothing.
      const powerPack = getPowerPackFromCheckout(
        event,
        session,
        parsePowerPackCatalog(Deno.env.get("STRIPE_POWER_PACKS_JSON")),
      );
      if (powerPack) {
        const { error } = await admin.rpc("grant_power_pack", {
          p_amount: powerPack.powerPoints,
          p_idempotency_key: `stripe:event:${powerPack.eventId}`,
          p_metadata: {
            pack_id: powerPack.packId,
            payment_intent: typeof session.payment_intent === "string"
              ? session.payment_intent
              : null,
            session_id: session.id,
            source: "stripe:checkout.session.completed",
          },
          p_pack_id: powerPack.packId,
          p_user_id: powerPack.userId,
        });
        if (error) throw error;
        return response("ok");
      }

      const refill = getCreditRefillFromCheckout(
        event,
        session,
        parseCreditPackCatalog(Deno.env.get("STRIPE_CREDIT_PACKS_JSON")),
      );
      if (!refill) return response("ignored");

      const { error } = await admin.rpc("grant_user_credits", {
        p_amount: refill.amount,
        p_idempotency_key: `stripe:event:${refill.eventId}`,
        p_reason: refill.reason,
        p_user_id: refill.userId,
      });
      if (error) throw error;
      return response("ok");
    }

    const isInvoiceEvent = event.type === "invoice.paid" || event.type === "invoice.payment_failed";
    const invoiceSubscription = isInvoiceEvent
      ? (event.data.object as Stripe.Invoice).subscription
      : null;
    const subscriptionId = typeof invoiceSubscription === "string"
      ? invoiceSubscription
      : invoiceSubscription?.id;
    if (isInvoiceEvent && !subscriptionId) return response("ignored");

    const subscription = isInvoiceEvent
      ? await stripe.subscriptions.retrieve(subscriptionId!)
      : event.data.object as Stripe.Subscription;
    if (!subscription?.id) return response("ignored");

    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;
    const priceId = subscription.items.data[0]?.price.id;
    const isDeleted = event.type === "customer.subscription.deleted";
    if (!isDeleted && (!priceId || !PRICE_TO_PLAN[priceId])) {
      return response("Unrecognized subscription price", 400);
    }
    const plan = isDeleted ? "free" : PRICE_TO_PLAN[priceId!];
    const status = isInvoiceEvent
      ? event.type === "invoice.paid" ? "active" : "past_due"
      : subscription.status;

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
        status,
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
