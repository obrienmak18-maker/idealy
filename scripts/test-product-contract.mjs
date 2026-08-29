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
assert.match(contract, /resource\.startsWith\("É"\)/);
assert.match(contract, /points"} \$\{separator\}\$\{resource\}/);
assert.match(personas, /normalizeIdealyWay/);
assert.match(welcome, /wayPresentations\.mage/);
assert.match(welcome, /setSelectedWay/);
assert.match(welcome, /register\?way=\$\{selectedWay\}/);
assert.doesNotMatch(welcome, /Les Nains|selectedVoice|dwarves/);

assert.match(powerPolicy, /free: \{ monthlyAllocation: 100, walletCap: 100 \}/);
assert.match(powerPolicy, /pro: \{ monthlyAllocation: 1_000, walletCap: 1_000 \}/);
assert.match(powerPolicy, /business: \{ monthlyAllocation: 3_000, walletCap: 3_000 \}/);
assert.match(powerPolicy, /mission_simple: 10/);
assert.match(powerPolicy, /mission_squad: 50/);
assert.match(powerPolicy, /regenerationCadence: "monthly"/);
assert.match(powerPolicy, /packsEnabled: false/);
assert.match(powerPolicy, /cooldownDays: 30/);
assert.match(powerPolicy, /grantsPower: false/);
assert.match(powerPolicy, /preservesBalance: true/);
assert.match(powerPolicy, /Votre \$\{resource\[way\]\} est épuisé/);

console.log("Idealy product contract passed.");
