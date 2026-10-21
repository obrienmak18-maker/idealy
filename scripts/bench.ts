/**
 * LOT K — Exécuteur `pnpm bench`.
 * Mode OFFLINE (défaut, CI/reproductible) : rejoue les projets de référence contre
 * une production simulée ou des fixtures, et évalue les assertions du harnais.
 * Mode LIVE (--live) : branché sur le pipeline réel (prompt système Voie + runner
 * conteneur LOT C), nécessite les clés d'API ; chaque projet est généré, exécuté,
 * puis jugé par les MÊMES assertions — le taux affiché change, la grille non.
 */

import {
  type BenchmarkProjet,
  type ProjetResultat,
  chargerProjetsBench,
  construireRapport,
  evaluerAssertions,
  formaterRapportPourConsole,
  lirePromptProjet,
} from "../lib/idealy/bench/engine";

async function main(): Promise<void> {
  const modeLive = process.argv.includes("--live");
  const projets = chargerProjetsBench();
  if (projets.length === 0) {
    console.error("✗ Aucun projet de benchmark trouvé dans benchmarks/.");
    process.exit(1);
  }
  console.log(`Bench Idealy — ${projets.length} projets (${modeLive ? "LIVE" : "OFFLINE"})`);

  const resultats: ProjetResultat[] = [];
  for (const projet of projets) {
    const prompt = lirePromptProjet(projet); // prouve que prompt.md existe et est lu
    let fichiers: Record<string, string>;
    let buildOk: boolean;

    if (modeLive) {
      // Branchement pipeline réel : génération → actions → runner → carte produite.
      const { genererEnModeLive } = await import("./bench-live-adapter.js");
      ({ fichiers, buildOk } = await genererEnModeLive(projet, prompt));
    } else {
      // OFFLINE : fixture « production parfaite » attendue du pipeline, puis
      // assertions. Valide la GRILLE de mesure elle-même (K.3/K.4 reproductibles).
      fichiers = fixtureParfaite(projet);
      buildOk = true;
    }

    const assertions = evaluerAssertions(projet, fichiers, buildOk);
    resultats.push({
      id: projet.id,
      statut: assertions.every((a) => a.ok) ? "PASS" : "FAIL",
      assertions,
    });
  }

  const rapport = construireRapport(resultats);
  console.log(formaterRapportPourConsole(rapport));
  // Rejouabilité : deux exécutions offline donnent le même taux (deterministic).
  process.exitCode = rapport.passants === rapport.total ? 0 : 1;
}

/** Fixture canonique : ce qu'un pipeline correct doit produire pour tout projet. */
function fixtureParfaite(projet: BenchmarkProjet): Record<string, string> {
  const fichiers: Record<string, string> = {};
  for (const f of projet.attente.fichiers_obligatoires) {
    if (f.endsWith("package.json")) {
      fichiers[f] = '{"name":"bench","scripts":{"build":"vite build"}}';
    } else if (f.endsWith(".html")) {
      fichiers[f] = "<!doctype html><html><body><div id=root></div></body></html>";
    } else {
      fichiers[f] = "export default function App(){return null}\n";
    }
  }
  return fichiers;
}

void main().catch((error: unknown) => {
  console.error("✗ Bench en échec :", error instanceof Error ? error.message : error);
  process.exit(1);
});
