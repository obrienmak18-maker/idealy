import { readFile } from "node:fs/promises";

const [confirmation, githubExport, pluginEngine] = await Promise.all([
  readFile("supabase/functions/mission-action-confirmation/index.ts", "utf8"),
  readFile("supabase/functions/github-export/index.ts", "utf8"),
  readFile("supabase/functions/plugin-engine/index.ts", "utf8"),
]);

for (const expected of [
  "mission_action_confirmations",
  "confirmation_token_hash",
  "github:export",
  "vercel:deploy",
  "canva:create-design",
  "notion:append-page",
  "slack:send-message",
  "expires_at",
  "status: \"approved\"",
]) {
  if (!confirmation.includes(expected)) {
    throw new Error(`Confirmation workflow is missing: ${expected}`);
  }
}

for (const expected of [
  "confirmationToken",
  "missionId",
  "payloadDigest",
  "status: \"consumed\"",
  "A valid one-time export confirmation is required.",
]) {
  if (!githubExport.includes(expected)) {
    throw new Error(`GitHub export confirmation guard is missing: ${expected}`);
  }
}

console.log("External action confirmation contract passed.");

for (const expected of [
  "confirmationToken",
  "CONFIRMATION_INVALID",
  "mission_action_confirmations",
  "consumed_at",
]) {
  if (!pluginEngine.includes(expected)) {
    throw new Error("Plugin engine write confirmation guard is missing: " + expected);
  }
}
