import { Router, type IRouter } from "express";
import Stripe from "stripe";

const router: IRouter = Router();

const PRODUCTS = {
  pro: {
    name: "Idealy Builder",
    description: "Missions avancées, déploiements et agents Pro.",
    monthly: 2900,
    yearly: 28800,
  },
  business: {
    name: "Idealy Legend",
    description: "Collaboration, rôles et support prioritaire.",
    monthly: 9900,
    yearly: 94800,
  },
} as const;

type Plan = keyof typeof PRODUCTS;
type BillingCycle = "monthly" | "yearly";

function isPlan(value: unknown): value is Plan {
  return value === "pro" || value === "business";
}

function isBillingCycle(value: unknown): value is BillingCycle {
  return value === "monthly" || value === "yearly";
}

router.post("/stripe/checkout", async (req, res) => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    res.status(503).json({ error: "Stripe is not configured on the server." });
    return;
  }

  const { plan, billingCycle = "monthly" } = req.body ?? {};
  if (!isPlan(plan) || !isBillingCycle(billingCycle)) {
    res.status(400).json({ error: "A valid plan and billing cycle are required." });
    return;
  }

  const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
  const configuredOrigin = process.env.APP_URL ?? process.env.FRONTEND_URL ?? origin;
  if (!configuredOrigin) {
    res.status(400).json({ error: "The application URL is not configured." });
    return;
  }

  const product = PRODUCTS[plan];
  const stripe = new Stripe(secretKey);
  const idempotencyKey = typeof req.headers["idempotency-key"] === "string"
    ? req.headers["idempotency-key"]
    : `idealy-${plan}-${billingCycle}-${crypto.randomUUID()}`;

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: product.name,
                description: product.description,
              },
              unit_amount: product[billingCycle],
              recurring: { interval: billingCycle === "yearly" ? "year" : "month" },
            },
            quantity: 1,
          },
        ],
        allow_promotion_codes: true,
        success_url: `${configuredOrigin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${configuredOrigin}/?checkout=cancelled`,
      },
      { idempotencyKey },
    );

    if (!session.url) {
      res.status(502).json({ error: "Stripe did not return a checkout URL." });
      return;
    }

    res.json({ url: session.url });
  } catch (error) {
    req.log?.error({ err: error, plan, billingCycle }, "Stripe checkout creation failed");
    res.status(502).json({ error: "Unable to start secure checkout." });
  }
});

export default router;
