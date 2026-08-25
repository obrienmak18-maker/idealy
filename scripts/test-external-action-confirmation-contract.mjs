import { readFile } from "node:fs/promises";

const [confirmation, githubExport] = await Promise.all([
  readFile("supabase/functions/mission-action-confirmation/index.ts", "utf8"),
  readFile("supabase/functions/github-export/index.ts", "utf8"),
]);

for (const expected of [
  "mission_action_confirmations",
  "confirmation_token_hash",
  "github:export",
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
