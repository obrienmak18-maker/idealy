import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [contract, welcome, personas] = await Promise.all([
  readFile("lib/idealy/product-contract.ts", "utf8"),
  readFile("app/welcome/page.tsx", "utf8"),
  readFile("lib/idealy/agent-personas.ts", "utf8"),
]);

for (const way of ["mage", "ninja", "hunter", "professional"]) {
  assert.match(contract, new RegExp(`\\b${way}:`));
}

for (const resource of ["Mana", "Chakra", "Nen", "Énergie"]) {
  assert.match(contract, new RegExp(`resourceLabel: "${resource}"`));
}

assert.match(contract, /idealyPlans = \["free", "pro", "business"\]/);
assert.match(contract, /formatPowerPoints/);
assert.match(contract, /points"} de \$\{resource\}/);
assert.match(personas, /normalizeIdealyWay/);
assert.match(welcome, /wayPresentations\.mage/);
assert.match(welcome, /setSelectedWay/);
assert.match(welcome, /register\?way=\$\{selectedWay\}/);
assert.doesNotMatch(welcome, /Les Nains|selectedVoice|dwarves/);

console.log("Idealy product contract passed.");
