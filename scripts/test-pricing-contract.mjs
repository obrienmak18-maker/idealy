import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [pricingFile, powerPolicyFile, readmeFile] = await Promise.all([
  readFile("config/pricing.ts", "utf8"),
  readFile("lib/idealy/power-policy.ts", "utf8"),
  readFile("README.md", "utf8"),
]);

// 1. Structure du fichier pricing
assert.match(pricingFile, /export const PRICING_TIERS/);
assert.match(pricingFile, /export function getPricingTier/);
assert.match(pricingFile, /export function estimateRequiredPower/);

// 2. Cohérence des allocations avec power-policy.ts
assert.match(pricingFile, /free: \{/);
assert.match(pricingFile, /pro: \{/);
assert.match(pricingFile, /business: \{/);
assert.match(pricingFile, /priceMonthlyEur: 29/);
assert.match(pricingFile, /priceMonthlyEur: 79/);

// 3. Cohérence avec README.md
assert.match(readmeFile, /Découverte \(Free\).*100 Power Points/);
assert.match(readmeFile, /Pro.*29 € \/ mois.*1 000 Power Points/);
assert.match(readmeFile, /Business.*79 € \/ mois.*3 000 Power Points/);

// 4. Formule de calcul d'estimation
assert.match(pricingFile, /simple \* powerActionCosts\.mission_simple \+ squad \* powerActionCosts\.mission_squad/);

console.log("Idealy pricing contract passed.");
