export const idealyWays = [
  "mage",
  "ninja",
  "hunter",
  "professional",
] as const;

export type IdealyWay = (typeof idealyWays)[number];

export const idealyPlans = ["free", "pro", "business"] as const;

export type IdealyPlan = (typeof idealyPlans)[number];

export type WayPresentation = {
  accentClassName: string;
  description: string;
  id: IdealyWay;
  label: string;
  resourceLabel: string;
};

export const wayPresentations: Record<IdealyWay, WayPresentation> = {
  mage: {
    accentClassName: "from-sky-400 to-violet-500",
    description: "Créer, explorer et tester des solutions originales avec méthode.",
    id: "mage",
    label: "Voie du Mage",
    resourceLabel: "Mana",
  },
  ninja: {
    accentClassName: "from-orange-400 to-red-500",
    description: "Avancer vite, précisément et avec le moins de friction possible.",
    id: "ninja",
    label: "Voie du Ninja",
    resourceLabel: "Chakra",
  },
  hunter: {
    accentClassName: "from-emerald-400 to-cyan-500",
    description: "Rechercher, comparer et choisir la meilleure prochaine étape.",
    id: "hunter",
    label: "Voie du Hunter",
    resourceLabel: "Nen",
  },
  professional: {
    accentClassName: "from-fuchsia-400 to-yellow-400",
    description: "Concevoir une base robuste, maintenable et prête à durer.",
    id: "professional",
    label: "Voie du Pro",
    resourceLabel: "Énergie",
  },
};

export function isIdealyWay(value: unknown): value is IdealyWay {
  return typeof value === "string" && idealyWays.includes(value as IdealyWay);
}

export function normalizeIdealyWay(value: unknown): IdealyWay {
  return isIdealyWay(value) ? value : "professional";
}

export function getWayPresentation(value: unknown): WayPresentation {
  return wayPresentations[normalizeIdealyWay(value)];
}

export function formatPowerPoints(value: number, way: unknown): string {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  const resource = getWayPresentation(way).resourceLabel;
  const separator = resource.startsWith("É") ? "d’" : "de ";
  return `${safeValue} ${safeValue === 1 ? "point" : "points"} ${separator}${resource}`;
}
