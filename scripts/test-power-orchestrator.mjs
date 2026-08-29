import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFile(resolve(root, path), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const [policy, estimateRoute, orchestrator, migration, migrationV2, sqlContract] = await Promise.all([
  read("lib/idealy/power-policy.ts"),
  read("app/api/idealy/power/route.ts"),
  read("supabase/functions/orchestrate-mission/index.ts"),
  read("supabase/migrations/20260828020000_power_system_v1.sql"),
  read("supabase/migrations/20260829000000_power_system_v2.sql"),
  read("supabase/tests/power-system-v1.sql"),
]);

assert(policy.includes("mission_simple: 10"), "Power simple mission cost must remain 10.");
assert(policy.includes("mission_squad: 50"), "Power squad mission cost must remain 50.");
assert(policy.includes("packsEnabled: false"), "Power packs must remain disabled in V1.");
assert(policy.includes("cooldownDays: 30"), "Power Way cooldown must remain 30 days.");
assert(estimateRoute.includes("getToken"), "Power estimate must require the server session.");
assert(estimateRoute.includes("getPowerActionCost"), "Power estimate must keep the server policy fallback.");
assert(estimateRoute.includes("get_my_power_status"), "Power estimate must read the authoritative Supabase Power status.");
assert(estimateRoute.includes("formatPowerPoints"), "Power estimate must return contextual resource labels.");
assert(!estimateRoute.includes("SUPABASE_SERVICE_ROLE"), "Power estimate must not expose a service role.");
assert(orchestrator.includes('admin.rpc("consume_power_points"'), "Squad orchestration must consume Power through the RPC.");
assert(orchestrator.includes('p_action_type: "mission_squad"'), "Squad orchestration must use the squad cost.");
assert(orchestrator.includes("p_run_id"), "Squad orchestration must call the V2 Power RPC signature.");
assert(orchestrator.includes("POWER_DEPLETED"), "Squad depletion must have a stable public code.");
assert(orchestrator.includes("powerDepletionMessage"), "Squad depletion must be contextualized by Way.");
assert(orchestrator.includes('appendEvent(admin, "power_consumed"'), "Orchestrator must persist the Power consumption event.");
assert(migration.includes("power_wallets"), "Power wallet migration must be present.");
assert(migration.includes("power_transactions"), "Power transaction migration must be present.");
assert(migrationV2.includes("get_my_power_status"), "Power V2 must expose an authenticated status RPC.");
assert(migrationV2.includes("power-v1:monthly:"), "Monthly Power allocation must use deterministic cycle idempotence.");
assert(migrationV2.includes("LEAST(v_cap, v_wallet.balance + v_allocation)"), "Monthly Power allocation must respect the wallet cap.");
assert(migrationV2.includes("p_run_id UUID DEFAULT NULL"), "Power ledger must support optional mission run linkage.");
assert(sqlContract.includes("Power consumption is missing concurrency"), "Power SQL contract must cover consumption guards.");

console.log("Idealy Power orchestration contract passed.");
