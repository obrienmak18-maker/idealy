import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [pricingFile, powerPolicyFile, readmeFile, pricingUi, publicPrices] = await Promise.all([
  readFile("config/pricing.ts", "utf8"),
  readFile("lib/idealy/power-policy.ts", "utf8"),
  readFile("README.md", "utf8"),
  readFile("components/billing/pricing-experience.tsx", "utf8"),
  readFile("config/pricing-display.ts", "utf8"),
]);

// 1. Structure du fichier pricing
assert.match(pricingFile, /export const PRICING_TIERS/);
assert.match(pricingFile, /export function getPricingTier/);
assert.match(pricingFile, /export function estimateRequiredPower/);

// 2. Cohérence des allocations avec power-policy.ts
assert.match(pricingFile, /free: \{/);
assert.match(pricingFile, /pro: \{/);
assert.match(pricingFile, /business: \{/);
assert.match(pricingFile, /priceMonthlyEur: 19/);
assert.match(pricingFile, /priceMonthlyEur: 49/);
assert.match(pricingFile, /annualPriceEur: 190\.8/);
assert.match(pricingFile, /annualPriceEur: 490\.8/);

// 3. Cohérence avec README.md
assert.match(readmeFile, /Découverte.*200 Power Points/);
assert.match(readmeFile, /Pro.*19 € \/ mois.*2 500 Power Points/);
assert.match(readmeFile, /Business.*49 € \/ mois.*4 000 Power Points/);

// 4. Formule de calcul d'estimation
assert.match(pricingFile, /simple \* powerActionCosts\.mission_simple \+ squad \* powerActionCosts\.mission_squad/);

// 5. L’expérience publique consomme les valeurs produit centrales.
assert.match(pricingFile, /priceMonthlyUsd: PRICING_DISPLAY\.pro\.monthlyUsd/);
assert.match(pricingFile, /priceMonthlyUsd: PRICING_DISPLAY\.business\.monthlyUsd/);
assert.match(pricingUi, /import \{ PRICING_DISPLAY \} from "@\/config\/pricing-display"/);
assert.match(pricingUi, /PRICING_DISPLAY\.pro\.monthlyEur/);
assert.match(pricingUi, /PRICING_DISPLAY\.business\.monthlyEur/);
assert.match(pricingUi, /powerPlanPolicy\.pro\.monthlyAllocation/);
assert.match(pricingUi, /powerPlanPolicy\.business\.monthlyAllocation/);
assert.doesNotMatch(pricingUi, /price: (?:19\.99|89),/);
assert.match(publicPrices, /pro: \{ monthlyEur: 19, annualEur: 190\.8, monthlyUsd: null \}/);
assert.match(publicPrices, /business: \{ monthlyEur: 49, annualEur: 490\.8, monthlyUsd: null \}/);

console.log("Idealy pricing contract passed.");
