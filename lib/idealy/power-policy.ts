import type { IdealyPlan, IdealyWay } from "./product-contract";

export const POWER_POLICY_VERSION = "power-v2";

// ─── Plan allocations ────────────────────────────────────────────────────────
// Free    :   100 pts / month  (découverte)
// Pro     : 2 500 pts / month  (base) — customisable jusqu'à 6 000 pts max
// Business: 8 000 pts / month  (toujours au-dessus du plafond Pro customisé)
export const powerPlanPolicy: Record<
  IdealyPlan,
  { monthlyAllocation: number; walletCap: number }
> = {
  business: { monthlyAllocation: 3_000, walletCap: 3_000 },
  free: { monthlyAllocation: 100, walletCap: 100 },
  pro: { monthlyAllocation: 1_000, walletCap: 1_000 },
};

// ─── Pro custom packs (choix de volume au checkout) ─────────────────────────
// L'utilisateur choisit son volume lors de l'abonnement Pro.
// La limite absolue est 6 000 pts — jamais dépassée.
export const PRO_PACK_OPTIONS = [
  { points: 2_500, priceEur: 29, label: "Starter" },
  { points: 3_500, priceEur: 39, label: "Growth" },
  { points: 4_500, priceEur: 49, label: "Scale" },
  { points: 6_000, priceEur: 59, label: "Elite" },
] as const satisfies readonly { points: number; priceEur: number; label: string }[];

export type ProPack = (typeof PRO_PACK_OPTIONS)[number];
export const PRO_PACK_MAX_POINTS = 6_000;
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
