/**
 * Contrat LOT K/L : le harnais de mesure produit un taux chiffré et reproductible ;
 * l'artefact de revue est écrit, localisé, et sert d'ENTRÉE à la boucle unique.
 */
import {
  chargerProjetsBench,
  construireRapport,
  evaluerAssertions,
  formaterRapportPourConsole,
  lirePromptProjet,
} from "../lib/idealy/bench/engine";
import {
  type ReviewReport,
  cheminRapportDeRevue,
  findingsVersFeedbackModele,
  rendreReviewMarkdown,
  validerRapportDeRevue,
} from "../lib/idealy/review/review-report";

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`✗ ${msg}`);
    process.exit(1);
  }
}

// K.2 — 5 projets minimum avec prompt + attentes testables.
const projets = chargerProjetsBench();
assert(projets.length >= 5, `benchmarks : ${projets.length} projets trouvés, attendu ≥ 5`);
for (const p of projets) {
  assert(lirePromptProjet(p).length > 30, `${p.id} : prompt.md absent ou trop court`);
  assert(p.attente.fichiers_obligatoires.length > 0, `${p.id} : aucune assertion de fichier`);
}

// K.3/K.4 — exécution offline déterministe : deux runs → même taux.
const fichiersParfaits: Record<string, Record<string, string>> = {};
for (const p of projets) {
  const f: Record<string, string> = {};
  for (const n of p.attente.fichiers_obligatoires) {
    f[n] = n.endsWith(".html") ? "<!doctype html><html></html>" : "export const x = 1;";
  }
  fichiersParfaits[p.id] = f;
}
const run1 = construireRapport(
  projets.map((p) => {
    const a = evaluerAssertions(p, fichiersParfaits[p.id], true);
    return { id: p.id, statut: a.every((x) => x.ok) ? ("PASS" as const) : ("FAIL" as const), assertions: a };
  }),
);
const run2 = construireRapport(run1.projets);
assert(run1.tauxReussitePct === 100, `production parfaite doit donner 100 %, obtenu ${run1.tauxReussitePct}`);
assert(run1.passants === run2.passants && run1.total === run2.total, "taux non reproductible entre deux runs");

// K.5 — assertions concrètes : placeholder détecté, import fantôme détecté, build manquant = FAIL bruyant.
const p0 = projets[0];
const avecPlaceholder = { ...fichiersParfaits[p0.id] };
avecPlaceholder[p0.attente.fichiers_obligatoires[0]] = "// TODO: implementer le reste";
const r1 = evaluerAssertions(p0, avecPlaceholder, true);
assert(r1.some((a) => !a.ok && a.nom.startsWith("sans-mot")), "placeholder non détecté par le harnais");

const avecImportFantome = { ...fichiersParfaits[p0.id] };
const cibles = Object.keys(avecImportFantome).filter((k) => /\.(ts|tsx)$/.test(k));
avecImportFantome[cibles[0]] = 'import { z } from "./inexistant";\nexport const x = 1;';
const r2 = evaluerAssertions(p0, avecImportFantome, true);
assert(r2.some((a) => !a.ok && a.nom === "imports-resolus"), "import fantôme non détecté");

const sansBuild = evaluerAssertions(p0, fichiersParfaits[p0.id], undefined);
assert(sansBuild.some((a) => !a.ok && a.nom === "build"), "build non fourni doit être un échec, jamais du silence");

const sortie = formaterRapportPourConsole(run1);
assert(sortie.includes("Taux de réussite : "), "sortie sans taux chiffré");

// L.1/L.3 — artefact de revue : rapport localisé, verdir en markdown, alimenter la boucle.
const rapport: ReviewReport = {
  missionId: "m-test",
  tour: 1,
  verdict: "corrige_requis",
  genereLe: new Date(0).toISOString(),
  findings: [
    { fichier: "src/App.tsx", ligne: 12, severite: "bloqueur", probleme: "import manquant", correctionProposee: "ajouter l'import depuis ./utils" },
    { fichier: "src/main.tsx", ligne: 3, severite: "mineur", probleme: "clé manquante dans une liste", correctionProposee: "ajouter key={id}" },
  ],
};
const md = rendreReviewMarkdown(rapport);
assert(md.includes("`src/App.tsx:12`") && md.includes("bloqueur"), "rapport markdown sans localisation/sévérité");
assert(md.indexOf("bloqueur") < md.indexOf("mineur"), "findings non triés par sévérité");
assert(cheminRapportDeRevue("m-test") === "reports/m-test/review.md", "chemin d'artefact non canonique");

const feedback = findingsVersFeedbackModele(rapport);
assert(feedback.includes("src/App.tsx:12") && feedback.includes("Corrige UNIQUEMENT"), "feedback modèle absent ou désordonné");
assert(validerRapportDeRevue(rapport).verdict === "corrige_requis", "validation du rapport échoue sur un rapport sain");

let rejete = false;
try {
  validerRapportDeRevue({ missionId: "x", verdict: "corrige_requis", findings: [{ fichier: "a.ts", ligne: 0, severite: "mineur", probleme: "p", correctionProposee: "c" }] });
} catch {
  rejete = true;
}
assert(rejete, "finding sans ligne valide doit être rejeté");

console.log("Idealy bench harness + review artifact contract verified (K+L). ✓");
