import { PRICING_TIERS } from "./pricing";

export const PRICING_DISPLAY = {
  free: {
    monthlyEur: PRICING_TIERS.free.priceMonthlyEur,
    annualEur: PRICING_TIERS.free.annualPriceEur ?? 0,
    monthlyUsd: PRICING_TIERS.free.priceMonthlyUsd,
  },
  pro: {
    monthlyEur: PRICING_TIERS.pro.priceMonthlyEur,
    annualEur: PRICING_TIERS.pro.annualPriceEur ?? 0,
    monthlyUsd: PRICING_TIERS.pro.priceMonthlyUsd,
  },
  business: {
    monthlyEur: PRICING_TIERS.business.priceMonthlyEur,
    annualEur: PRICING_TIERS.business.annualPriceEur ?? 0,
    monthlyUsd: PRICING_TIERS.business.priceMonthlyUsd,
  },
} as const;
