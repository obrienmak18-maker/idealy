/** Public prices used by the product catalog and billing presentation.
 *
 * EUR is the approved product currency for the current price decision.
 * USD remains explicit-but-unset until the team chooses its USD prices.
 */
export const PRICING_DISPLAY = {
  free: { monthlyEur: 0, annualEur: 0, monthlyUsd: null },
  pro: { monthlyEur: 19, annualEur: 190.8, monthlyUsd: null },
  business: { monthlyEur: 49, annualEur: 490.8, monthlyUsd: null },
} as const;
