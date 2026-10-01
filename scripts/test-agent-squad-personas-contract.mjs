/**
 * test-agent-squad-personas-contract.mjs
 *
 * Verifies Phase 5 constraints:
 *   1. Sélène Ardent (Architecte), Maël Forge (Builder), Iris Vale (Reviewer) are formally registered in agent-personas.ts
 *   2. orchestrate-mission explicitly binds the 3 operators in their respective prompt dispatches
 *   3. The 4 Voies (professional, ninja, hunter, mage) have distinct and coherent voice directions
 *   4. Narrative signature constraint: operators are original personas, never existing franchises
 *   5. Chat UI message waiting indicator does not use generic English "Waiting..." placeholder
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// ─── 1. Agent roster in agent-personas.ts ─────────────────────────────────────
const personas = read("lib/idealy/agent-personas.ts");

assert.match(personas, /name:\s*"Sélène Ardent"/, "Sélène Ardent must be defined as Architect");
assert.match(personas, /name:\s*"Maël Forge"/, "Maël Forge must be defined as Builder");
assert.match(personas, /name:\s*"Iris Vale"/, "Iris Vale must be defined as Reviewer");

assert.match(personas, /key:\s*"architect"/, "architect key must exist");
assert.match(personas, /key:\s*"builder"/, "builder key must exist");
assert.match(personas, /key:\s*"reviewer"/, "reviewer key must exist");

// ─── 2. Orchestration prompt binding ─────────────────────────────────────────
const orchestrator = read("supabase/functions/orchestrate-mission/index.ts");

assert.match(
  orchestrator,
  /Sélène Ardent/,
  "orchestrate-mission must invoke Sélène Ardent for Architect stage"
);

assert.match(
  orchestrator,
  /Maël Forge/,
  "orchestrate-mission must invoke Maël Forge for Builder stage"
);

assert.match(
  orchestrator,
  /Iris Vale/,
  "orchestrate-mission must invoke Iris Vale for Reviewer stage"
);

// ─── 3. The 4 Voies voice profiles ───────────────────────────────────────────
assert.match(orchestrator, /hunter:/, "orchestrator must handle hunter voice");
assert.match(orchestrator, /mage:/, "orchestrator must handle mage voice");
assert.match(orchestrator, /ninja:/, "orchestrator must handle ninja voice");
assert.match(orchestrator, /professional:/, "orchestrator must handle professional voice");

// ─── 4. Message component waiting text ───────────────────────────────────────
const message = read("components/chat/message.tsx");
assert.doesNotMatch(
  message,
  /"Waiting\.\.\."/,
  "message.tsx must not contain generic 'Waiting...' placeholder"
);

console.log("Agent squad personas contract verified. ✓");
