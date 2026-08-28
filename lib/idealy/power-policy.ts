import type { IdealyPlan, IdealyWay } from "./product-contract";

export const POWER_POLICY_VERSION = "power-v1";

export const powerPlanPolicy: Record<
  IdealyPlan,
  { monthlyAllocation: number; walletCap: number }
> = {
  business: { monthlyAllocation: 3_000, walletCap: 3_000 },
  free: { monthlyAllocation: 100, walletCap: 100 },
  pro: { monthlyAllocation: 1_000, walletCap: 1_000 },
};

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
