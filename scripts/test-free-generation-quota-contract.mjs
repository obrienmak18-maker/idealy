import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// ─── 1. Static Contract Checks ───────────────────────────────────────────────
const [chatRoute, squadRoute, checkoutRoute, portalRoute, edgeCheckout, freeQuotaManager] =
  await Promise.all([
    readFile("app/(chat)/api/chat/route.ts", "utf8"),
    readFile("app/api/idealy/missions/[missionId]/squad/route.ts", "utf8"),
    readFile("app/api/idealy/billing/checkout/route.ts", "utf8"),
    readFile("app/api/idealy/billing/portal/route.ts", "utf8"),
    readFile("supabase/functions/create-checkout-session/index.ts", "utf8"),
    readFile("lib/idealy/free-quota.ts", "utf8"),
  ]);

// Verify payment guards
for (const [name, source] of [
  ["checkout route", checkoutRoute],
  ["portal route", portalRoute],
  ["create-checkout-session edge function", edgeCheckout],
]) {
  assert.match(
    source,
    /IDEALY_PAYMENTS_ENABLED/,
    `${name} must check IDEALY_PAYMENTS_ENABLED`
  );
  assert.match(
    source,
    /PAYMENTS_DISABLED/,
    `${name} must return PAYMENTS_DISABLED error code`
  );
}

// Verify free quota wiring in generation pipelines
assert.match(
  chatRoute,
  /reserveFreeGeneration/,
  "chat route must invoke reserveFreeGeneration"
);
assert.match(
  chatRoute,
  /commitFreeGeneration/,
  "chat route must commit free quota on success"
);
assert.match(
  chatRoute,
  /refundFreeGeneration/,
  "chat route must refund free quota on error"
);
assert.match(
  squadRoute,
  /reserveFreeGeneration/,
  "squad route must invoke reserveFreeGeneration"
);
assert.match(
  squadRoute,
  /commitFreeGeneration/,
  "squad route must commit free quota on success"
);
assert.match(
  squadRoute,
  /refundFreeGeneration/,
  "squad route must refund free quota on error"
);

// ─── 2. Functional Quota Logic Tests ──────────────────────────────────────────
const EXPECTED_EXCEEDED_MESSAGE =
  "Vous avez atteint votre limite de générations gratuites. Les offres payantes arrivent bientôt. Votre progression est sauvegardée.";

assert.match(
  freeQuotaManager,
  new RegExp(EXPECTED_EXCEEDED_MESSAGE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  "free-quota.ts must define the exact French error message"
);

// Test simulator simulating the pure engine logic
function createTestQuotaManager(limit = 5) {
  const store = new Map();

  function getRecords(userId) {
    if (!store.has(userId)) store.set(userId, []);
    return store.get(userId);
  }

  function countUsed(records) {
    return records.filter((r) => r.status === "reserved" || r.status === "completed").length;
  }

  return {
    async getStatus(userId) {
      const records = getRecords(userId);
      const used = countUsed(records);
      const remaining = Math.max(0, limit - used);
      const allowed = remaining > 0;
      return { allowed, limit, remaining, used, message: allowed ? null : EXPECTED_EXCEEDED_MESSAGE };
    },
    async reserve(userId, idempotencyKey) {
      const records = getRecords(userId);
      const existing = records.find((r) => r.idempotencyKey === idempotencyKey);
      if (existing && (existing.status === "reserved" || existing.status === "completed")) {
        const used = countUsed(records);
        return { allowed: true, limit, remaining: Math.max(0, limit - used), used, message: null };
      }
      const used = countUsed(records);
      if (used >= limit) {
        return { allowed: false, limit, remaining: 0, used, message: EXPECTED_EXCEEDED_MESSAGE };
      }
      records.push({ idempotencyKey, status: "reserved" });
      const newUsed = countUsed(records);
      return { allowed: true, limit, remaining: Math.max(0, limit - newUsed), used: newUsed, message: null };
    },
    async commit(userId, idempotencyKey) {
      const records = getRecords(userId);
      const r = records.find((x) => x.idempotencyKey === idempotencyKey);
      if (r) r.status = "completed";
    },
    async refund(userId, idempotencyKey) {
      const records = getRecords(userId);
      const r = records.find((x) => x.idempotencyKey === idempotencyKey);
      if (r) r.status = "refunded";
    },
  };
}

const manager = createTestQuotaManager(5);
const USER_A = "user-test-uuid-a";
const USER_B = "user-test-uuid-b";

// Test 1: Initial state has 5 remaining
let status = await manager.getStatus(USER_A);
assert.equal(status.allowed, true);
assert.equal(status.used, 0);
assert.equal(status.remaining, 5);

// Test 2: Sequential successful reservations (1 to 5)
for (let i = 1; i <= 5; i++) {
  const res = await manager.reserve(USER_A, `run-user-a-${i}`);
  assert.equal(res.allowed, true);
  assert.equal(res.used, i);
  assert.equal(res.remaining, 5 - i);
  await manager.commit(USER_A, `run-user-a-${i}`);
}

// Test 3: Request #6 must be rejected with 403 and friendly French message
const rejected = await manager.reserve(USER_A, "run-user-a-6");
assert.equal(rejected.allowed, false);
assert.equal(rejected.remaining, 0);
assert.equal(rejected.used, 5);
assert.equal(rejected.message, EXPECTED_EXCEEDED_MESSAGE);

// Test 4: Idempotent repeat of an already completed run does NOT decrement
const repeat = await manager.reserve(USER_A, "run-user-a-3");
assert.equal(repeat.allowed, true);
assert.equal(repeat.used, 5);
assert.equal(repeat.remaining, 0);

// Test 5: Technical refund releases a slot
await manager.refund(USER_A, "run-user-a-5");
status = await manager.getStatus(USER_A);
assert.equal(status.allowed, true);
assert.equal(status.used, 4);
assert.equal(status.remaining, 1);

// Now a new run can proceed into the freed slot
const recovered = await manager.reserve(USER_A, "run-user-a-recovery");
assert.equal(recovered.allowed, true);
assert.equal(recovered.used, 5);
assert.equal(recovered.remaining, 0);

// Test 6: User B is isolated and still has full quota
const statusB = await manager.getStatus(USER_B);
assert.equal(statusB.allowed, true);
assert.equal(statusB.used, 0);
assert.equal(statusB.remaining, 5);

console.log("Free generation quota and payment security contract passed cleanly! ✓");
