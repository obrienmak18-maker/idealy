/**
 * LOT L — Artefact de revue écrit et persistant.
 * La critique ne produit plus seulement un verdict dans le chat : elle génère un
 * rapport `reports/<missionId>/review.md` (problèmes localisés, sévérité, correction
 * proposée) ET une entrée d'événement `review_report` dans le journal de mission
 * existant (missions/[missionId]/events). Le rapport est l'ENTRÉE de la boucle de
 * correction unique du dépôt (correction-loop LOT E) — pas un chemin parallèle.
 */

export type ReviewSeverity = "bloqueur" | "majeur" | "mineur";

export interface ReviewFinding {
  fichier: string;
  ligne: number;
  severite: ReviewSeverity;
  probleme: string;
  correctionProposee: string;
}

export interface ReviewReport {
  missionId: string;
  tour: number;
  verdict: "approuve" | "corrige_requis";
  findings: ReviewFinding[];
  genereLe: string;
}

const SEVERITE_ORDRE: Record<ReviewSeverity, number> = {
  bloqueur: 0,
  majeur: 1,
  mineur: 2,
};

/** Rendu Markdown canonique de l'artefact (consultable après rechargement). */
export function rendreReviewMarkdown(rapport: ReviewReport): string {
  const lignes: string[] = [
    `# Rapport de revue — mission ${rapport.missionId}`,
    "",
    `- Tour : ${rapport.tour}`,
    `- Verdict : ${rapport.verdict}`,
    `- Généré le : ${rapport.genereLe}`,
    `- Problèmes : ${rapport.findings.length}`,
    "",
  ];
  if (rapport.findings.length === 0) {
    lignes.push("Aucun problème détecté. La mission peut passer en vérification finale.");
  } else {
    lignes.push("| Sévérité | Localisation | Problème | Correction proposée |");
    lignes.push("| --- | --- | --- | --- |");
    for (const f of [...rapport.findings].sort(
      (a, b) => SEVERITE_ORDRE[a.severite] - SEVERITE_ORDRE[b.severite],
    )) {
      lignes.push(
        `| ${f.severite} | \`${f.fichier}:${f.ligne}\` | ${f.probleme} | ${f.correctionProposee} |`,
      );
    }
  }
  return `${lignes.join("\n")}\n`;
}

/** Chemin canonique de l'artefact dans le workspace de mission. */
export function cheminRapportDeRevue(missionId: string): string {
  return `reports/${missionId}/review.md`;
}

/**
 * Fusion avec la boucle d'erreurs existante : conversion des findings en feedback
 * structuré pour le modèle (même grammaire que formatCorrectionFeedback LOT E),
 * triés par sévérité, plafonnés au budget du tour.
 */
export function findingsVersFeedbackModele(
  rapport: ReviewReport,
  maxFindings = 5,
): string {
  if (rapport.verdict === "approuve" || rapport.findings.length === 0) {
    return "";
  }
  const tops = [...rapport.findings]
    .sort((a, b) => SEVERITE_ORDRE[a.severite] - SEVERITE_ORDRE[b.severite])
    .slice(0, maxFindings);
  const corps = tops
    .map(
      (f) =>
        `- ${f.fichier}:${f.ligne} [${f.severite}] ${f.probleme} → correction attendue : ${f.correctionProposee}`,
    )
    .join("\n");
  return (
    `La revue (tour ${rapport.tour}) a détecté ${rapport.findings.length} problème(s). ` +
    `Corrige UNIQUEMENT les suivants, puis rejoue la vérification :\n${corps}`
  );
}

/** Validation stricte d'un rapport reçu du pass critique (jamais de rapport muet). */
export function validerRapportDeRevue(brut: unknown): ReviewReport {
  const r = brut as Partial<ReviewReport>;
  if (!r || typeof r.missionId !== "string" || !Array.isArray(r.findings)) {
    throw new Error("Rapport de revue invalide : missionId ou findings manquants.");
  }
  if (r.verdict !== "approuve" && r.verdict !== "corrige_requis") {
    throw new Error(`Verdict de revue inconnu : ${String(r.verdict)}`);
  }
  for (const f of r.findings) {
    if (typeof f.fichier !== "string" || typeof f.ligne !== "number" || f.ligne < 1) {
      throw new Error("Finding sans localisation fichier:ligne valide — rejeté.");
    }
    if (!(f.severite in SEVERITE_ORDRE)) {
      throw new Error(`Sévérité inconnue : ${String(f.severite)}`);
    }
  }
  return r as ReviewReport;
}
