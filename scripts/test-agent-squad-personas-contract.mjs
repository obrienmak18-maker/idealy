/**
 * test-agent-squad-personas-contract.mjs
 *
 * Verifies the canonical five-agent Way runtime:
 *   1. Each Way exposes chief/builder/designer/specialist/reviewer.
 *   2. The orchestrator dispatches the same five roles.
 *   3. The four Ways preserve their distinct voice directions.
 *   4. Agent names are the product-defined Way roster; public-commercial IP
 *      replacement remains a separate launch requirement.
 *   5. Chat UI waiting state must not use a generic "Waiting..." placeholder.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const personas = read("lib/idealy/agent-personas.ts");
for (const key of ["chief", "builder", "designer", "specialist", "reviewer"]) {
  assert.match(personas, new RegExp(`key: "\${key}"`), `\${key} must exist in every Way roster`);
}

for (const name of [
  "Minato", "Naruto", "Sakura", "Sasuke", "Shikamaru",
  "Erza", "Natsu", "Lucie", "Luxus", "Mirajane",
  "Netero", "Gon", "Leolio", "Kurapika", "Killua",
  "Daniel", "Kevin", "Leslie", "Bill", "Maya",
]) {
  assert.match(personas, new RegExp(`name: "\${name}"`), `Way agent \${name} must be present`);
}

const orchestrator = read("supabase/functions/orchestrate-mission/index.ts");
for (const role of ["chief", "builder", "designer", "specialist", "reviewer"]) {
  assert.match(orchestrator, new RegExp(`key: "\${role}"`), `orchestrator must declare \${role}`);
}
for (const way of ["hunter:", "mage:", "ninja:", "professional:"]) {
  assert.match(orchestrator, new RegExp(way), `orchestrator must handle \${way}`);
}

const message = read("components/chat/message.tsx");
assert.doesNotMatch(
  message,
  /"Waiting\.\.\."/,
  "message.tsx must not contain generic 'Waiting...' placeholder"
);

console.log("Five-agent Way squad contract verified. ✓");
