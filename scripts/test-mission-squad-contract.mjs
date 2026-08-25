import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const migration = await readFile(resolve(root, "supabase/migrations/20260825000000_mission_agent_orchestration.sql"), "utf8");
const orchestrator = await readFile(resolve(root, "supabase/functions/orchestrate-mission/index.ts"), "utf8");
const workspaceTopBar = await readFile(resolve(root, "components/chat/build-top-bar.tsx"), "utf8");

for (const expected of ["mission_agent_runs", "mission_action_confirmations", "confirmation_token_hash", "REVOKE ALL", "GRANT SELECT"]) {
  if (!migration.includes(expected)) throw new Error(`Missing migration protection: ${expected}`);
}
for (const expected of ["architect", "builder", "reviewer", "idempotencyKey", "workspaceStream", "agent_failed", "user_id"]) {
  if (!orchestrator.includes(expected)) throw new Error(`Missing squad contract: ${expected}`);
}
for (const expected of ["/squad", "crypto.randomUUID", "Run squad", "missionReplayNonce"]) {
  if (!workspaceTopBar.includes(expected)) throw new Error(`Missing workspace squad launch: ${expected}`);
}
console.log("Mission squad contract verified.");
