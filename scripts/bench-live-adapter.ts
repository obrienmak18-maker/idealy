/**
 * LOT K — Adaptateur LIVE du bench : branchement sur le pipeline Idealy RÉEL.
 * Génère via l'orchestrateur (prompt système Voie du LOT A/I), exécute les actions
 * via le runner LOT C (API WebContainer interne d'Idealy, jamais une API tierce),
 * puis lit la carte de fichiers produite pour les assertions du harnais.
 * Nécessite les clés d'API ; non utilisé en mode OFFLINE/CI.
 */

import type { BenchmarkProjet } from "../lib/idealy/bench/engine";

export interface ResultatLive {
  fichiers: Record<string, string>;
  buildOk: boolean;
}

/**
 * Point d'entrée du bench live. Le branchement complet (appel LLM réel + conteneur)
 * est derrière un feature-flag : sans lui, l'adaptateur échoue bruyamment plutôt
 * que de simuler (règle dépôt : jamais de faux PASS).
 */
export async function genererEnModeLive(
  projet: BenchmarkProjet,
  prompt: string,
): Promise<ResultatLive> {
  const actif = process.env.IDEALY_BENCH_LIVE === "1";
  if (!actif) {
    throw new Error(
      `Mode live demandé pour ${projet.id} sans IDEALY_BENCH_LIVE=1. ` +
        `Refus de simuler un résultat live.`,
    );
  }

  // Pipeline réel : buildIUPS → parseur d'actions LOT D → runner LOT C → carte finale.
  const { runIdealyActions } = await import("@/lib/idealy/actions/runner");

  void runIdealyActions;
  throw new Error(
    "Branchement orchestrateur→runner en cours de câblage : non simulé. " +
      "Point unique `orchestrerMissionBench` à exposer côté orchestrateur avant live.",
  );
}
