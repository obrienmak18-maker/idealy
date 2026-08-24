import { designProviders, getDesignProvider } from "./providers";
import type { DesignSpecification } from "./types";

export type DesignCriticIssue = {
  code: string;
  message: string;
  recommendation: string;
  severity: "error" | "info" | "warning";
};

export type DesignCriticResult = {
  issues: DesignCriticIssue[];
  passed: boolean;
  score: number;
};

const fullUiSystems = new Set([
  "ant-design",
  "chakra",
  "heroui",
  "mantine",
  "material-ui",
]);

export function runDesignCritic(specification: DesignSpecification): DesignCriticResult {
  const issues: DesignCriticIssue[] = [];
  const selected = specification.selectedProviders;
  const selectedUiSystems = selected.filter((provider) => fullUiSystems.has(provider));

  if (selectedUiSystems.length > 1) {
    issues.push({
      code: "multiple-ui-systems",
      message: `Plusieurs systèmes UI complets ont été sélectionnés : ${selectedUiSystems.join(", ")}.`,
      recommendation: "Conserver un seul système UI complet ; utiliser les autres uniquement comme référence ou les retirer.",
      severity: "error",
    });
  }

  if (specification.dependencies.length > 6) {
    issues.push({
      code: "dependency-bloat",
      message: `La Design Stack demande ${specification.dependencies.length} dépendances.`,
      recommendation: "Réduire la stack aux dépendances qui apportent une valeur visible et non remplaçable par le projet.",
      severity: "warning",
    });
  }

  if (specification.analysis.threeD && specification.analysis.platform === "mobile") {
    issues.push({
      code: "mobile-3d-performance",
      message: "La 3D est activée pour une cible mobile.",
      recommendation: "Imposer une scène légère, un chargement différé, une image/fallback et une interaction non-WebGL équivalente.",
      severity: "warning",
    });
  }

  if (specification.analysis.threeD && !specification.constraints.some((constraint) => constraint.toLowerCase().includes("fallback"))) {
    issues.push({
      code: "missing-3d-fallback",
      message: "Aucun fallback 3D explicite n’est présent dans les contraintes.",
      recommendation: "Ajouter une représentation statique et une alternative accessible avant de rendre la scène obligatoire.",
      severity: "error",
    });
  }

  if (specification.analysis.accessibility === "high" && !selected.includes("lucide") && !selected.includes("material-symbols") && !selected.includes("tabler") && !selected.includes("phosphor")) {
    issues.push({
      code: "icon-accessibility-review",
      message: "Une cible avec exigence d’accessibilité élevée n’a pas de famille d’icônes identifiée.",
      recommendation: "Choisir une famille d’icônes cohérente et ajouter des noms accessibles aux contrôles icon-only.",
      severity: "warning",
    });
  }

  if (specification.analysis.charts && specification.analysis.platform === "mobile") {
    issues.push({
      code: "mobile-chart-review",
      message: "Des graphiques sont prévus sur mobile.",
      recommendation: "Prévoir un conteneur responsive, une lecture tactile raisonnable et une alternative tabulaire ou textuelle.",
      severity: "warning",
    });
  }

  const requestedMissing = specification.requestedProviders.filter(
    (provider) => getDesignProvider(provider) && !selected.includes(provider)
  );
  if (requestedMissing.length > 0) {
    issues.push({
      code: "explicit-provider-not-selected",
      message: `Les choix explicites suivants n’ont pas pu être sélectionnés : ${requestedMissing.join(", ")}.`,
      recommendation: "Expliquer l’incompatibilité au demandeur et proposer une alternative ; ne pas remplacer silencieusement la technologie.",
      severity: "error",
    });
  }

  if (selected.length > 8) {
    issues.push({
      code: "stack-complexity",
      message: `La Design Stack contient ${selected.length} capacités.`,
      recommendation: "Conserver uniquement les providers qui ont un rôle concret dans la première version.",
      severity: "warning",
    });
  }

  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  const score = Math.max(0, 100 - errorCount * 25 - warningCount * 8);
  return { issues, passed: errorCount === 0, score };
}

export function formatDesignCritic(result: DesignCriticResult) {
  if (!result.issues.length) return `Design Critic: passed (score ${result.score}/100).`;
  return [
    `Design Critic: ${result.passed ? "passed with recommendations" : "requires changes"} (score ${result.score}/100).`,
    ...result.issues.map((issue) => `[${issue.severity}] ${issue.code}: ${issue.message} ${issue.recommendation}`),
  ].join("\n");
}

export function getRegisteredProviderCount() {
  return designProviders.length;
}
