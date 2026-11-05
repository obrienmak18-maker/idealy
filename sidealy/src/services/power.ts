import { voiesCatalog } from "./voies-catalog";

export type PowerStatus = {
  balance: number;
  walletCap: number;
  plan: string;
  way: string;
  resourceLabel: string;
  canExecute: boolean;
  periodKey: string;
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

/**
 * Quota par défaut et de repli (ex. en local dev ou hors-ligne).
 * Par défaut sur la voie Mage avec 100 points de Mana / mois (Plan Gratuit).
 */
function getFallbackPower(): PowerResult {
  try {
    const cached = localStorage.getItem("idealy_power_cache");
    if (cached) {
      const parsed = JSON.parse(cached) as PowerStatus;
      if (
        parsed &&
        typeof parsed.balance === "number" &&
        typeof parsed.walletCap === "number" &&
        parsed.walletCap > 0
      ) {
        return { state: "ok", power: parsed };
      }
    }
  } catch {
    // ignore
  }

  return {
    state: "ok",
    power: {
      balance: 100,
      walletCap: 100,
      plan: "free",
      way: "mage",
      resourceLabel: "Mana",
      canExecute: true,
      periodKey: "",
    },
  };
}

export async function fetchPower(signal?: AbortSignal): Promise<PowerResult> {
  try {
    const response = await fetch("/api/idealy/power", {
      credentials: "include",
      headers: { Accept: "application/json" },
      signal,
    });
    if (response.status === 401) return { state: "signed-out" };
    if (!response.ok) return getFallbackPower();
    const data = (await response.json()) as Record<string, unknown>;
    const balance = Number(data.balance);
    const walletCap = Number(data.walletCap);
    if (!Number.isFinite(balance) || !Number.isFinite(walletCap) || walletCap <= 0) {
      return getFallbackPower();
    }
    const way = typeof data.way === "string" ? data.way : "mage";
    const label =
      (typeof data.resourceLabel === "string" && data.resourceLabel) ||
      voiesCatalog[way]?.resourceLabel ||
      WAY_LABELS[way] ||
      "Mana";
    const power: PowerStatus = {
      balance,
      walletCap,
      plan: typeof data.plan === "string" ? data.plan : "free",
      way,
      resourceLabel: label,
      canExecute: data.canExecute !== false,
      periodKey: typeof data.lastMonthlyAllocationAt === "string" ? data.lastMonthlyAllocationAt : "",
    };
    try {
      localStorage.setItem("idealy_power_cache", JSON.stringify(power));
    } catch {
      // ignore
    }
    return {
      state: "ok",
      power,
    };
  } catch {
    return getFallbackPower();
  }
}

export type PowerLevel = "ok" | "low" | "critical";

export function powerLevel(p: PowerStatus): PowerLevel {
  const ratio = p.balance / p.walletCap;
  if (ratio <= 0.05) return "critical";
  if (ratio <= 0.2) return "low";
  return "ok";
}

/** Teinte ("r,g,b") et ton de voix par voie, partagés par la pastille et les alertes. */
export const WAY_TONE: Record<string, { rgb: string; low: string; critical: string; depleted: string }> = {
  ninja: { rgb: "249,115,22", low: "Votre Chakra s’amenuise.", critical: "Votre Chakra est presque épuisé.", depleted: "Votre Chakra est épuisé." },
  mage: { rgb: "139,92,246", low: "Votre Mana faiblit.", critical: "Votre Mana est presque épuisé.", depleted: "Votre Mana est épuisé." },
  hunter: { rgb: "20,184,166", low: "Votre Nen se raréfie.", critical: "Votre Nen est presque épuisé.", depleted: "Votre Nen est épuisé." },
  professional: { rgb: "217,70,239", low: "Votre Énergie baisse.", critical: "Votre Énergie est presque épuisée.", depleted: "Votre Énergie est épuisée." },
};
export const toneFor = (way: string) => WAY_TONE[way] ?? WAY_TONE.mage;

export type PowerLevelEx = "ok" | "low" | "critical" | "depleted";
export function powerLevelEx(p: PowerStatus): PowerLevelEx {
  if (p.balance <= 0) return "depleted";
  return powerLevel(p);
}
