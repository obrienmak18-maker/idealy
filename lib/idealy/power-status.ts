import {
  getPowerActionCost,
  isPowerAction,
  POWER_POLICY_VERSION,
} from "./power-policy";
import {
  getWayPresentation,
  type IdealyWay,
  isIdealyWay,
} from "./product-contract";

export type PowerAction = "mission_simple" | "mission_squad";

export type PowerStatus = {
  actionType: PowerAction | null;
  balance: number;
  canExecute: boolean;
  costPoints: number | null;
  lastMonthlyAllocationAt: string | null;
  lastWayChangeAt: string | null;
  plan: "free" | "pro" | "business";
  policyVersion: string;
  resourceLabel: string;
  way: IdealyWay;
  walletCap: number;
};

export function powerUiState(
  status: Pick<PowerStatus, "balance" | "canExecute" | "costPoints">
) {
  if (status.balance === 0) {
    return "depleted" as const;
  }
  if (status.costPoints !== null && !status.canExecute) {
    return "insufficient" as const;
  }
  return "normal" as const;
}

export function parsePowerStatus(input: unknown): PowerStatus | null {
  if (!input || typeof input !== "object") {
    return null;
  }
  const {
    actionType,
    balance: rawBalance,
    canExecute,
    costPoints: rawCostPoints,
    lastMonthlyAllocationAt,
    lastWayChangeAt,
    plan,
    policyVersion,
    walletCap: rawWalletCap,
    way,
  } = input as Record<string, unknown>;
  if (
    !isIdealyWay(way) ||
    !["free", "pro", "business"].includes(String(plan))
  ) {
    return null;
  }
  if (actionType !== null && !isPowerAction(actionType)) {
    return null;
  }
  const balance = Number(rawBalance);
  const walletCap = Number(rawWalletCap);
  if (
    !Number.isInteger(balance) ||
    !Number.isInteger(walletCap) ||
    balance < 0 ||
    walletCap < 0
  ) {
    return null;
  }
  const costPoints =
    rawCostPoints === null || rawCostPoints === undefined
      ? null
      : Number(rawCostPoints);
  return {
    actionType: actionType as PowerAction | null,
    balance,
    canExecute: canExecute === true,
    costPoints:
      costPoints !== null && Number.isInteger(costPoints) ? costPoints : null,
    lastMonthlyAllocationAt:
      typeof lastMonthlyAllocationAt === "string"
        ? lastMonthlyAllocationAt
        : null,
    lastWayChangeAt:
      typeof lastWayChangeAt === "string" ? lastWayChangeAt : null,
    plan: plan as PowerStatus["plan"],
    policyVersion:
      typeof policyVersion === "string" ? policyVersion : POWER_POLICY_VERSION,
    resourceLabel: getWayPresentation(way).resourceLabel,
    walletCap,
    way,
  };
}

export function formatPowerBalance(balance: number, way: unknown) {
  const safeBalance = Number.isFinite(balance)
    ? Math.max(0, Math.floor(balance))
    : 0;
  return `${safeBalance} points de ${getWayPresentation(way).resourceLabel}`;
}

export function getPowerCost(action: unknown) {
  return isPowerAction(action) ? getPowerActionCost(action) : null;
}
