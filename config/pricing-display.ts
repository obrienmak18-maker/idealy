import { PRICING_TIERS } from "./pricing";

export const PRICING_DISPLAY = {
  free: { monthlyEur: 0, annualEur: 0, monthlyUsd: null },
  pro: { monthlyEur: 19, annualEur: 190.8, monthlyUsd: null },
  business: { monthlyEur: 49, annualEur: 490.8, monthlyUsd: null },
} as const;
