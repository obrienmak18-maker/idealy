import { readFile } from "node:fs/promises";

const files = await Promise.all(
  [
    "supabase/functions/create-checkout-session/index.ts",
    "supabase/functions/create-billing-portal/index.ts",
    "supabase/functions/cancel-subscription/index.ts",
    "supabase/functions/check-subscription/index.ts",
  ].map(async (path) => [path, await readFile(path, "utf8")]),
);

for (const [path, source] of files) {
  for (const expected of ["corsResponse", "optionsResponse", "auth.getUser"]) {
    if (!source.includes(expected)) {
      throw new Error(`${path} is missing billing security control: ${expected}`);
    }
  }
  for (const unsafe of ["Access-Control-Allow-Origin\": appOrigin || \"*\"", "req.headers.get(\"origin\") || \"http://localhost:3000\""]) {
    if (source.includes(unsafe)) {
      throw new Error(`${path} still contains an unsafe origin fallback`);
    }
  }
}

const [checkout, status, cancel] = files.map(([, source]) => source);
for (const expected of ["idempotencyKey: `idealy:checkout:", "activeSubscription", "appOrigin.replace"]) {
  if (!checkout.includes(expected)) throw new Error(`Checkout hardening is missing: ${expected}`);
}
if (status.includes("stripeCustomerId")) throw new Error("Billing status exposes stripeCustomerId");
if (cancel.includes("subscriptionId:")) throw new Error("Cancellation response exposes subscriptionId");

const [subscriptionStatus, aiProvider, webhook] = await Promise.all([
  readFile("supabase/functions/check-subscription/index.ts", "utf8"),
  readFile("supabase/functions/process-ai-request/aiProvider.ts", "utf8"),
  readFile("supabase/functions/stripe-webhook/index.ts", "utf8"),
]);
if (!subscriptionStatus.includes('planId: active ? subscription?.plan ?? "free" : "free"')) {
  throw new Error("Inactive billing statuses must not retain paid plan entitlements.");
}
if (aiProvider.includes('if (profile?.plan && profile.plan !== "free") return "trial"')) {
  throw new Error("AI provider mode must not trust a stale profile plan without an active subscription.");
}
if (!webhook.includes('return response("Unrecognized subscription price", 400)')) {
  throw new Error("Unknown Stripe subscription prices must fail visibly instead of downgrading silently.");
}

const [pluginListRoute, pluginExecutionRoute, pluginService] = await Promise.all([
  readFile("app/api/idealy/plugins/route.ts", "utf8"),
  readFile("app/api/idealy/plugins/[pluginId]/execute/route.ts", "utf8"),
  readFile("lib/idealy/plugins/service.ts", "utf8"),
]);
for (const [path, source] of [
  ["plugin list", pluginListRoute],
  ["plugin execution", pluginExecutionRoute],
]) {
  if (source.includes('searchParams.get("plan")')) {
    throw new Error(`${path} must not trust a plan supplied by the caller.`);
  }
  if (!source.includes("getVerifiedUserPlan") || !source.includes("planError || !plan")) {
    throw new Error(`${path} must block when the server cannot verify subscription entitlements.`);
  }
}
if (!pluginService.includes('getIdealySupabaseFunctionUrl("check-subscription")')) {
  throw new Error("Plugin entitlements must be read from the authenticated billing backend.");
}

console.log("Billing security contract passed.");
