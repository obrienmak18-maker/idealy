import type { IdealyPlan, IdealyWay } from "./product-contract";

export const POWER_POLICY_VERSION = "power-v2";

// ─── Plan allocations ────────────────────────────────────────────────────────
// Product-approved allocations and wallet caps.
// Free: 200 / 250
// Pro: 2 500 / 3 500
// Business: 4 000 / 7 000
// Custom Power remains non-billable until its economics and checkout are implemented.
export const powerPlanPolicy: Record<
  IdealyPlan,
  { monthlyAllocation: number; walletCap: number }
> = {
  business: { monthlyAllocation: 4_000, walletCap: 7_000 },
  free: { monthlyAllocation: 200, walletCap: 250 },
  pro: { monthlyAllocation: 2_500, walletCap: 3_500 },
};

// ─── Historical Pro pack definitions ────────────────────────────────────────
// Kept in code for compatibility; packs are currently disabled and are not
// exposed as billable choices until the billing model is finalized.
export const PRO_PACK_OPTIONS = [
  { points: 2_500, priceEur: 29, label: "Starter" },
  { points: 3_500, priceEur: 39, label: "Growth" },
  { points: 4_500, priceEur: 49, label: "Scale" },
  { points: 6_000, priceEur: 59, label: "Elite" },
] as const satisfies readonly { points: number; priceEur: number; label: string }[];

export type ProPack = (typeof PRO_PACK_OPTIONS)[number];
export const PRO_PACK_MAX_POINTS = 3_500;
export const PRO_PACK_DEFAULT_POINTS = 2_500;

export const powerActionCosts = {
  mission_simple: 10,
  mission_squad: 50,
} as const;

export type PowerAction = keyof typeof powerActionCosts;

export const powerPolicy = {
  actionCosts: powerActionCosts,
  monthlyRenewal: true,
  packsEnabled: false,
  regenerationCadence: "monthly",
  version: POWER_POLICY_VERSION,
  wayChange: {
    cooldownDays: 30,
    grantsPower: false,
    preservesBalance: true,
  },
} as const;

export function getPlanPowerPolicy(plan: IdealyPlan) {
  return powerPlanPolicy[plan];
}

export function getPowerActionCost(action: PowerAction) {
  return powerActionCosts[action];
}

export function isPowerAction(value: unknown): value is PowerAction {
  return typeof value === "string" && value in powerActionCosts;
}

export function powerDepletionMessage(way: IdealyWay) {
  const resource =
    {
      hunter: "Nen",
      mage: "Mana",
      ninja: "Chakra",
      professional: "Énergie",
    } satisfies Record<IdealyWay, string>;

  return `Votre ${resource[way]} est épuisé.`;
}
