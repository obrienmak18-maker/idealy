/**
 * LOT K — Harnais de mesure Idealy (mécanisme inspiré du module `benchmark` de
 * gpt-engineer, AntonOsika/gpt-engineer, MIT) : un projet de test = prompt +
 * assertions vérifiables ; un exécuteur rejouable produit PASS/FAIL avec la raison
 * exacte de l'échec et un taux de réussite global chiffré.
 * Réécriture TypeScript native : aucun portage Python, aucune dépendance ajoutée.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export interface BenchmarkAttente {
  fichiers_obligatoires: string[];
  mots_interdits_code: string[];
  imports_resolus_exiges: boolean;
  build_doit_passer: boolean;
}

export interface BenchmarkProjet {
  id: string;
  prompt_fichier: string;
  attente: BenchmarkAttente;
}

export interface AssertionResultat {
  nom: string;
  ok: boolean;
  raison: string;
}

export interface ProjetResultat {
  id: string;
  statut: "PASS" | "FAIL";
  assertions: AssertionResultat[];
}

export interface RapportBench {
  executLe: string;
  projets: ProjetResultat[];
  passants: number;
  total: number;
  tauxReussitePct: number;
}

const RACINE_BENCH = path.join(process.cwd(), "benchmarks");

/** Charge tous les projets de référence (dossiers contenant benchmark.json). */
export function chargerProjetsBench(): BenchmarkProjet[] {
  if (!existsSync(RACINE_BENCH)) return [];
  const dossiers = readdirSync(RACINE_BENCH, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  const projets: BenchmarkProjet[] = [];
  for (const dossier of dossiers) {
    const fichier = path.join(RACINE_BENCH, dossier, "benchmark.json");
    if (!existsSync(fichier)) continue;
    projets.push(JSON.parse(readFileSync(fichier, "utf8")) as BenchmarkProjet);
  }
  return projets;
}

/** Prompt d'un projet (K.2 : prompt.md à côté du benchmark.json). */
export function lirePromptProjet(projet: BenchmarkProjet): string {
  const fichier = path.join(RACINE_BENCH, projet.id, projet.prompt_fichier);
  if (!existsSync(fichier)) {
    throw new Error(`Prompt manquant pour ${projet.id} : ${fichier}`);
  }
  return readFileSync(fichier, "utf8").trim();
}

/**
 * K.5 — Assertions concrètes sur une carte de fichiers produite.
 * Vérifie : présence des fichiers attendus, non-vide, absence de placeholder/mot
 * interdit, imports relatifs résolus. `build_doit_passer` est évalué par l'appelant
 * (exécuteur branché sur le runner LOT C) et passé en résultat explicite.
 */
export function evaluerAssertions(
  projet: BenchmarkProjet,
  fichiers: Record<string, string>,
  buildOk?: boolean,
): AssertionResultat[] {
  const resultats: AssertionResultat[] = [];
  const pousser = (nom: string, ok: boolean, raison: string) =>
    resultats.push({ nom, ok, raison });

  // 1. Fichiers obligatoires présents et non vides.
  for (const f of projet.attente.fichiers_obligatoires) {
    const contenu = fichiers[f];
    pousser(
      `fichier:${f}`,
      typeof contenu === "string" && contenu.trim().length > 0,
      contenu === undefined
        ? `manquant : ${f}`
        : contenu.trim().length === 0
          ? `vide : ${f}`
          : `${f} présent (${contenu.length} caractères)`,
    );
  }

  // 2. Mots interdits (placeholder, TODO, troncature) dans tout le code produit.
  for (const mot of projet.attente.mots_interdits_code) {
    const fautifs = Object.entries(fichiers)
      .filter(([chemin, c]) => !chemin.endsWith(".md") && c.includes(mot))
      .map(([chemin]) => chemin);
    pousser(
      `sans-mot:${mot}`,
      fautifs.length === 0,
      fautifs.length === 0
        ? `aucun « ${mot} »`
        : `« ${mot} » trouvé dans ${fautifs.join(", ")}`,
    );
  }

  // 3. Imports relatifs résolus (pas d'import fantôme).
  if (projet.attente.imports_resolus_exiges) {
    const casses: string[] = [];
    for (const [chemin, contenu] of Object.entries(fichiers)) {
      if (!/\.(ts|tsx|js|jsx)$/.test(chemin)) continue;
      const dir = path.posix.dirname(chemin);
      const regex = /(?:from|import)\s+["'](\.[^"']+)["']/g;
      let m: RegExpExecArray | null = regex.exec(contenu);
      while (m !== null) {
        const cible = path.posix.normalize(path.posix.join(dir, m[1]));
        const candidats = [
          cible,
          `${cible}.ts`,
          `${cible}.tsx`,
          `${cible}.js`,
          `${cible}/index.ts`,
          `${cible}/index.tsx`,
        ];
        if (!candidats.some((c) => c in fichiers)) {
          casses.push(`${chemin} → ${m[1]}`);
        }
        m = regex.exec(contenu);
      }
    }
    pousser(
      "imports-resolus",
      casses.length === 0,
      casses.length === 0
        ? "tous les imports relatifs pointent un fichier produit"
        : `imports non résolus : ${casses.join(" ; ")}`,
    );
  }

  // 4. Build (résultat fourni par l'exécuteur ; absent = échec bruyant, jamais silencieux).
  if (projet.attente.build_doit_passer) {
    pousser(
      "build",
      buildOk === true,
      buildOk === undefined
        ? "résultat de build non fourni — traité comme échec (jamais de silence)"
        : buildOk
          ? "build OK"
          : "build en échec",
    );
  }

  return resultats;
}

/** Agrégation finale : taux chifré, reproductible (tri déterministe). */
export function construireRapport(resultats: ProjetResultat[]): RapportBench {
  const passants = resultats.filter((r) => r.statut === "PASS").length;
  const total = resultats.length;
  return {
    executLe: new Date().toISOString(),
    projets: resultats,
    passants,
    total,
    tauxReussitePct: total === 0 ? 0 : Math.round((passants / total) * 1000) / 10,
  };
}

export function formaterRapportPourConsole(rapport: RapportBench): string {
  const lignes: string[] = ["", "=== BENCHMARK IDEALY ==="];
  for (const p of rapport.projets) {
    lignes.push(`${p.statut === "PASS" ? "✓" : "✗"} ${p.id} — ${p.statut}`);
    for (const a of p.assertions.filter((x) => !x.ok)) {
      lignes.push(`    ✗ ${a.nom} : ${a.raison}`);
    }
  }
  lignes.push("");
  lignes.push(
    `Taux de réussite : ${rapport.passants}/${rapport.total} (${rapport.tauxReussitePct} %)`,
  );
  return lignes.join("\n");
}
