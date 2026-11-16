import { getBearerToken } from "./firebase";
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
  hunter: "Nen",
  mage: "Mana",
  ninja: "Chakra",
  professional: "Énergie",
};

/**
 * Quota de repli lorsque le service est indisponible.
 * Si un cache existe, il est affiché à titre indicatif mais NE DOIT JAMAIS autoriser l'exécution (canExecute: false).
 * En l'absence de cache vérifié, l'état "unavailable" est retourné sans inventer de solde fictif.
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
        return {
          power: {
            ...parsed,
            canExecute: false, // Jamais d'autorisation d'exécution sur la seule base du cache
          },
          state: "ok",
        };
      }
    }
  } catch {
    // ignore
  }

  return { state: "unavailable" };
}

export async function fetchPower(signal?: AbortSignal): Promise<PowerResult> {
  try {
    const bearer = await getBearerToken();
    const userWay = localStorage.getItem("idealy_user_way") || "ninja";
    const headers: Record<string, string> = {
      Accept: "application/json",
      "x-idealy-user-way": userWay,
    };
    if (bearer) {
      headers["Authorization"] = `Bearer ${bearer}`;
    }

    const response = await fetch("/api/idealy/power", {
      credentials: "include",
      headers,
      signal,
    });
    if (response.status === 401) {
      return { state: "signed-out" };
    }
    if (!response.ok) {
      return getFallbackPower();
    }
    const data = (await response.json()) as Record<string, unknown>;
    const balance = Number(data.balance);
    const walletCap = Number(data.walletCap);
    if (
      !Number.isFinite(balance) ||
      !Number.isFinite(walletCap) ||
      walletCap <= 0
    ) {
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
      canExecute: data.canExecute !== false,
      periodKey:
        typeof data.lastMonthlyAllocationAt === "string"
          ? data.lastMonthlyAllocationAt
          : "",
      plan: typeof data.plan === "string" ? data.plan : "free",
      resourceLabel: label,
      walletCap,
      way,
    };
    try {
      localStorage.setItem("idealy_power_cache", JSON.stringify(power));
    } catch {
      // ignore
    }
    return {
      power,
      state: "ok",
    };
  } catch {
    return getFallbackPower();
  }
}

export type PowerLevel = "ok" | "low" | "critical";

export function powerLevel(p: PowerStatus): PowerLevel {
  const ratio = p.balance / p.walletCap;
  if (ratio <= 0.05) {
    return "critical";
  }
  if (ratio <= 0.2) {
    return "low";
  }
  return "ok";
}

/** Teinte ("r,g,b") et ton de voix par voie, partagés par la pastille et les alertes. */
export const WAY_TONE: Record<
  string,
  { rgb: string; low: string; critical: string; depleted: string }
> = {
  hunter: {
    critical: "Votre Nen est presque épuisé.",
    depleted: "Votre Nen est épuisé.",
    low: "Votre Nen se raréfie.",
    rgb: "20,184,166",
  },
  mage: {
    critical: "Votre Mana est presque épuisé.",
    depleted: "Votre Mana est épuisé.",
    low: "Votre Mana faiblit.",
    rgb: "139,92,246",
  },
  ninja: {
    critical: "Votre Chakra est presque épuisé.",
    depleted: "Votre Chakra est épuisé.",
    low: "Votre Chakra s’amenuise.",
    rgb: "249,115,22",
  },
  professional: {
    critical: "Votre Énergie est presque épuisée.",
    depleted: "Votre Énergie est épuisée.",
    low: "Votre Énergie baisse.",
    rgb: "217,70,239",
  },
};
export const toneFor = (way: string) => WAY_TONE[way] ?? WAY_TONE.mage;

export type PowerLevelEx = "ok" | "low" | "critical" | "depleted";
export function powerLevelEx(p: PowerStatus): PowerLevelEx {
  if (p.balance <= 0) {
    return "depleted";
  }
  return powerLevel(p);
}
