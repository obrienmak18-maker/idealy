import { voiesCatalog } from "./voies-catalog";

export type PowerStatus = {
  balance: number;
  walletCap: number;
  plan: string;
  way: string;
  resourceLabel: string;
  canExecute: boolean;
};

export type PowerResult =
  | { state: "ok"; power: PowerStatus }
  | { state: "signed-out" }
  | { state: "unavailable" };

const WAY_LABELS: Record<string, string> = {
  ninja: "Chakra",
  mage: "Mana",
  hunter: "Nen",
  professional: "Énergie",
};

export async function fetchPower(signal?: AbortSignal): Promise<PowerResult> {
  try {
    const response = await fetch("/api/idealy/power", {
      credentials: "include",
      headers: { Accept: "application/json" },
      signal,
    });
    if (response.status === 401) return { state: "signed-out" };
    if (!response.ok) return { state: "unavailable" };
    const data = (await response.json()) as Record<string, unknown>;
    const balance = Number(data.balance);
    const walletCap = Number(data.walletCap);
    if (!Number.isFinite(balance) || !Number.isFinite(walletCap) || walletCap <= 0) {
      return { state: "unavailable" };
    }
    const way = typeof data.way === "string" ? data.way : "professional";
    const label =
      (typeof data.resourceLabel === "string" && data.resourceLabel) ||
      voiesCatalog[way]?.resourceLabel ||
      WAY_LABELS[way] ||
      "Énergie";
    return {
      state: "ok",
      power: {
        balance,
        walletCap,
        plan: typeof data.plan === "string" ? data.plan : "free",
        way,
        resourceLabel: label,
        canExecute: data.canExecute !== false,
      },
    };
  } catch {
    return { state: "unavailable" };
  }
}

export type PowerLevel = "ok" | "low" | "critical";

export function powerLevel(p: PowerStatus): PowerLevel {
  const ratio = p.balance / p.walletCap;
  if (ratio <= 0.05) return "critical";
  if (ratio <= 0.2) return "low";
  return "ok";
}
