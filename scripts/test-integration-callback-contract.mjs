import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const callback = await readFile(
  new URL("../supabase/functions/integration-callback/index.ts", import.meta.url),
  "utf8"
).then((source) => source.replace(/\r\n/g, "\n"));

const identityCheck = callback.indexOf("if (!userResponse.ok || typeof githubUser?.id !== \"number\" || !githubUser.login)");
const integrationWrite = callback.indexOf(".from(\"user_integrations\")\n      .upsert(");
const credentialFailure = callback.indexOf("if (credentialError)");
const failedStatus = callback.indexOf("status: \"error\"", credentialFailure);

assert.notEqual(identityCheck, -1, "GitHub profile verification must check the HTTP result and identity.");
assert.ok(identityCheck < integrationWrite, "Do not persist an active integration before GitHub identity is verified.");
assert.notEqual(credentialFailure, -1, "Credential storage failures must be handled explicitly.");
assert.notEqual(failedStatus, -1, "A missing credential must not leave an integration marked active.");

console.log("Integration callback contract passed.");
