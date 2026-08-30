import { readFile } from "node:fs/promises";

const files = {
  migration: await readFile(
    "supabase/migrations/20260830000000_power_system_v2.sql",
    "utf8"
  ),
  policy: await readFile("lib/idealy/power-policy.ts", "utf8"),
  route: await readFile("app/api/idealy/power/route.ts", "utf8"),
  sidebar: await readFile("components/chat/app-sidebar.tsx", "utf8"),
  simple: await readFile(
    "supabase/functions/process-ai-request/index.ts",
    "utf8"
  ),
  status: await readFile("lib/idealy/power-status.ts", "utf8"),
  topbar: await readFile("components/chat/build-top-bar.tsx", "utf8"),
};

for (const expected of [
  "get_my_power_status",
  "SECURITY DEFINER",
  "SET search_path = public",
  "GRANT EXECUTE ON FUNCTION public.get_my_power_status(TEXT) TO authenticated",
  "auth.uid()",
  "can_execute",
  "resource_label",
]) {
  if (!files.migration.includes(expected)) {
    throw new Error(`Power V2 migration missing: ${expected}`);
  }
}
for (const expected of [
  "mission_simple: 10",
  "mission_squad: 50",
  "packsEnabled: false",
  "cooldownDays: 30",
  "grantsPower: false",
]) {
  if (!files.policy.includes(expected)) {
    throw new Error(`Power policy regression: ${expected}`);
  }
}
for (const expected of [
  "formatPowerBalance",
  "points de",
  "resourceLabel",
  "powerUiState",
  "depleted",
  "insufficient",
]) {
  if (!files.status.includes(expected)) {
    throw new Error(`Power status contract missing: ${expected}`);
  }
}
for (const expected of [
  "/rest/v1/rpc/get_my_power_status",
  "Authorization",
  "accessToken",
  "Cache-Control",
  "parsePowerStatus",
]) {
  if (!files.route.includes(expected)) {
    throw new Error(`Power API boundary missing: ${expected}`);
  }
}
const simpleMissionBlock = files.simple.slice(
  files.simple.indexOf("const isSimpleMission"),
  files.simple.indexOf("// Every centrally managed inference consumes credits"),
);
for (const expected of [
  "isSimpleMission",
  "if (managed && isSimpleMission)",
  "p_action_type: 'mission_simple'",
  "POWER_REQUIRED",
  "workspaceStream !== true",
  "p_idempotency_key: powerKey",
]) {
  if (!simpleMissionBlock.includes(expected)) {
    throw new Error(`Simple mission Power debit missing: ${expected}`);
  }
}
if (simpleMissionBlock.includes("managed === false")) {
  throw new Error("BYOK must not reach consume_power_points");
}
if (simpleMissionBlock.indexOf("if (managed && isSimpleMission)") > simpleMissionBlock.indexOf("consume_power_points")) {
  throw new Error("The managed guard must wrap consume_power_points");
}
for (const expected of ["PowerStatusBadge", "<PowerStatusBadge />"]) {
  if (!files.sidebar.includes(expected)) {
    throw new Error(`Sidebar Power UI missing: ${expected}`);
  }
}
if (!files.topbar.includes("<PowerStatusBadge compact />")) {
  throw new Error("Workspace top bar Power UI missing");
}

console.log("Power System V2 contract passed.");
