import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const orchestrator = await readFile("supabase/functions/orchestrate-mission/index.ts", "utf8");

// 1. Définition de la limite stricte de 3 itérations
assert.match(orchestrator, /MAX_REVIEW_ITERATIONS = 3/);
assert.match(orchestrator, /iteration <= MAX_REVIEW_ITERATIONS/);

// 2. Présence des champs de diagnostic obligatoires (Directive 10)
for (const field of [
  "evidence",
  "expectedBehavior",
  "file",
  "location",
  "problem",
  "severity",
  "suggestedCorrection",
]) {
  assert.match(orchestrator, new RegExp(`\\b${field}:`), `Reviewer diagnostic must contain field: ${field}`);
}

// 3. Boucle de rétroaction et réinjection vers le Builder
assert.match(orchestrator, /auto_correction_started/);
assert.match(orchestrator, /DIAGNOSTIC DU REVIEWER/);
assert.match(orchestrator, /correction ciblée/);

// 4. Terminaison contrôlée : passed ou needs-user-input (Directive 10)
assert.match(orchestrator, /needs-user-input/);
assert.doesNotMatch(orchestrator, /while \(true\)/, "Infinite generation loop is forbidden");

console.log("Reviewer closed loop contract passed.");
