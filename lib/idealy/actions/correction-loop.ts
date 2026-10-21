/**
 * Contrat de boucle d'erreurs terminal → modèle (LOT E) — logique pure, testable.
 *
 * Ce module structure la boucle qui existait déjà de façon optionnelle dans
 * integrations/idealy/backend-core/src/core/webcontainer/selfCorrection.ts :
 *   sortie conteneur → diagnostic (terminalDiagnostics.parseTerminalIssues)
 *   → feedback structuré au modèle → nouvelle tentative, avec budget anti-boucle.
 * Il n'exécute rien lui-même : il décide (continuer / bloquer) et formate le
 * feedback. L'exécution reste dans selfCorrection.ts + l'API WebContainer d'Idealy.
 */

export const MAX_CORRECTION_ITERATIONS = 3;

export interface CorrectionIssue {
  file: string | null;
  line: number | null;
  column: number | null;
  message: string;
}

export interface ValidationOutcome {
  command: string;
  exitCode: number;
  issues: CorrectionIssue[];
}

export type LoopDecision =
  | { action: "retry"; iteration: number; feedbackToModel: string }
  | { action: "pass" }
  | { action: "blocked"; reason: string };

/**
 * Décision après une validation échouée. Budget dur :
 *  - MAX_CORRECTION_ITERATIONS tours de correction au total ;
 *  - plafond de crédits par mission fourni par l'appelant (free-quota/idempotency).
 * À l'épuisement : statut bloqué, message clair, zéro nouvelle consommation.
 */
export function decideCorrectionLoop(
  outcome: ValidationOutcome,
  completedIterations: number,
  creditsRemaining: number,
): LoopDecision {
  if (outcome.exitCode === 0 && outcome.issues.length === 0) {
    return { action: "pass" };
  }
  if (creditsRemaining <= 0) {
    return {
      action: "blocked",
      reason: `Budget de crédits épuisé après ${completedIterations} tour(s). Arrêt propre, aucune consommation supplémentaire.`,
    };
  }
  if (completedIterations >= MAX_CORRECTION_ITERATIONS) {
    return {
      action: "blocked",
      reason: `Échec après ${MAX_CORRECTION_ITERATIONS} tentatives de correction sur « ${outcome.command} ». La mission est marquée bloquée : intervention utilisateur requise.`,
    };
  }
  const next = completedIterations + 1;
  return { action: "retry", iteration: next, feedbackToModel: formatTerminalFeedback(outcome, next) };
}

/**
 * Feedback structuré renvoyé au modèle : commande réelle, erreurs RÉELLES du
 * terminal (fichier/ligne/colonne), contrainte de réponse (actions seules),
 * et interdiction de placeholder. C'est ce texte qui débloque « l'agent ne sait
 * pas qu'il a tort ».
 */
export function formatTerminalFeedback(outcome: ValidationOutcome, iteration: number): string {
  const header = `[DIAGNOSTIC CONTENEUR — tentative ${iteration}/${MAX_CORRECTION_ITERATIONS}]`;
  const cmd = `La commande « ${outcome.command} » a échoué (code de sortie ${outcome.exitCode}).`;
  const list = outcome.issues
    .map((issue) => {
      const loc = [issue.file, issue.line ?? "?", issue.column ?? "?"].filter(Boolean).join(":");
      return `- ${loc ? `${loc} — ` : ""}${issue.message}`;
    })
    .join("\n");
  const ask =
    "Corrige UNIQUEMENT les fichiers concernés. Réponds par les actions " +
    "<idealyAction type=\"file\"> complètes des fichiers corrigés (contenu entier, " +
    "aucun placeholder, aucun autre changement). Ne relance pas le serveur.";
  return `${header}\n${cmd}\nErreurs :\n${list || "- aucune ligne d'erreur exploitable ; sortie vide."}\n\n${ask}`;
}

/** Clé d'idempotence d'une tentative de correction (réutilise le schéma du dépôt). */
export function correctionIdempotencyKey(missionId: string, iteration: number): string {
  return `${missionId}:correction:${iteration}`;
}
