import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [contract, welcome, personas, powerPolicy] = await Promise.all([
  readFile("lib/idealy/product-contract.ts", "utf8"),
  readFile("app/welcome/page.tsx", "utf8"),
  readFile("lib/idealy/agent-personas.ts", "utf8"),
  readFile("lib/idealy/power-policy.ts", "utf8"),
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
assert.match(welcome, /voiesCatalog/);
assert.match(welcome, /setSelectedWay/);
assert.match(welcome, /register\?way=\$\{selectedWay\}/);
assert.match(welcome, /powerPlanPolicy/);
assert.doesNotMatch(welcome, /100 Power Points|1 000 Power Points|3 000 Power Points|29 €|79 €|Architecte \+ Builder \+ Reviewer/);
assert.doesNotMatch(welcome, /Les Nains|selectedVoice|dwarves/);

assert.match(powerPolicy, /free: \{ monthlyAllocation: 200, walletCap: 250 \}/);
assert.match(powerPolicy, /pro: \{ monthlyAllocation: 2_500, walletCap: 3_500 \}/);
assert.match(powerPolicy, /business: \{ monthlyAllocation: 4_000, walletCap: 7_000 \}/);
assert.match(powerPolicy, /mission_simple: 10/);
assert.match(powerPolicy, /mission_squad: 50/);
assert.match(powerPolicy, /regenerationCadence: "monthly"/);
assert.match(powerPolicy, /packsEnabled: false/);
assert.match(powerPolicy, /cooldownDays: 30/);
assert.match(powerPolicy, /grantsPower: false/);
assert.match(powerPolicy, /preservesBalance: true/);
assert.match(powerPolicy, /Votre \$\{resource\[way\]\} est épuisé/);

console.log("Idealy product contract passed.");
