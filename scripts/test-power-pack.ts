/**
 * Stripe Power Pack logic tests.
 *
 * The live webhook test (scripts/test-stripe-webhook.mjs) needs real Supabase
 * and Stripe secrets. These assertions cover the decision logic that decides how
 * much Power a purchase is worth, which is the part that must never be
 * client-controlled.
 *
 * Run with: pnpm run test:power-pack
 */
import assert from "node:assert/strict";
import {
  getCreditRefillFromCheckout,
  getPowerPackFromCheckout,
  parseCreditPackCatalog,
  parsePowerPackCatalog,
} from "../supabase/functions/stripe-webhook/stripe-webhook";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

console.log("Idealy Stripe Power Pack tests");

const catalog = {
  "pack-500": { points: 1, powerPoints: 500 },
  "pack-2000": { points: 1, powerPoints: 2000 },
};

console.log("\n# catalogue parsing");
check("reads the server-owned pack catalogue", () => {
  const parsed = parsePowerPackCatalog(
    JSON.stringify({ "pack-500": { powerPoints: 500 } })
  );
  assert.equal(parsed["pack-500"].powerPoints, 500);
});

check("rejects a pack with a non-positive amount", () => {
  const parsed = parsePowerPackCatalog(
    JSON.stringify({ alsoBad: { powerPoints: -5 }, bad: { powerPoints: 0 } })
  );
  assert.deepEqual(parsed, {});
});

check("returns an empty catalogue for malformed JSON", () => {
  assert.deepEqual(parsePowerPackCatalog("{not json"), {});
});

check("returns an empty catalogue when unset", () => {
  assert.deepEqual(parsePowerPackCatalog(undefined), {});
});

console.log("\n# purchase resolution");
check("resolves a pack purchase from the catalogue", () => {
  const purchase = getPowerPackFromCheckout(
    { id: "evt_1" },
    {
      id: "cs_1",
      metadata: { power_pack_id: "pack-500", user_id: "user-a" },
      mode: "payment",
    },
    catalog
  );
  assert.deepEqual(purchase, {
    eventId: "evt_1",
    packId: "pack-500",
    powerPoints: 500,
    userId: "user-a",
  });
});

check("ignores a pack that is not in the server catalogue", () => {
  const purchase = getPowerPackFromCheckout(
    { id: "evt_2" },
    {
      id: "cs_2",
      // A client claiming a huge pack that the server never configured.
      metadata: { power_pack_id: "pack-free-money", user_id: "user-a" },
      mode: "payment",
    },
    catalog
  );
  assert.equal(purchase, null);
});

check("never credits a subscription checkout", () => {
  const purchase = getPowerPackFromCheckout(
    { id: "evt_3" },
    {
      id: "cs_3",
      metadata: { power_pack_id: "pack-500", user_id: "user-a" },
      mode: "subscription",
    },
    catalog
  );
  assert.equal(purchase, null);
});

check("refuses a purchase with no user", () => {
  const purchase = getPowerPackFromCheckout(
    { id: "evt_4" },
    { id: "cs_4", metadata: { power_pack_id: "pack-500" }, mode: "payment" },
    catalog
  );
  assert.equal(purchase, null);
});

check("keeps the legacy credit refill path working", () => {
  const refill = getCreditRefillFromCheckout(
    { id: "evt_5" },
    {
      id: "cs_5",
      metadata: { credit_pack_id: "legacy", user_id: "user-b" },
      mode: "payment",
    },
    parseCreditPackCatalog(JSON.stringify({ legacy: 250 }))
  );
  assert.equal(refill?.amount, 250);
  assert.equal(refill?.userId, "user-b");
  assert.equal(refill?.packId, "legacy");
});

console.log(`\n${passed} Power Pack assertions passed.`);
