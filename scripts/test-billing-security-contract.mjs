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

console.log("Billing security contract passed.");
