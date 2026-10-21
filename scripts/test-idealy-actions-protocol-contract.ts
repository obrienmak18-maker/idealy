/**
 * Tests de contrat du protocole d'actions Idealy (LOT B/C/D/E/F).
 * Exécuteur : tsx (script npm `test:actions-protocol`).
 *
 * Couvre :
 *  - parsing en streaming sur flux PARTIELS (D.3) : balise ouverte non fermée,
 *    coupure au milieu d'une balise/attribut, deux actions dans un même chunk,
 *    action vide ;
 *  - rejet B.4 des fichiers vides / placeholders ;
 *  - ordre d'exécution C.4 + runner séquentiel avec conteneur factice (C.1/C.3) ;
 *  - détection de framework F (vite-react + expo) ;
 *  - budget anti-boucle E (3 échecs → blocked, crédits épuisés → blocked).
 */

import assert from "node:assert/strict";

import { validateIdealyAction } from "../lib/idealy/actions/schema";
import { IdealyActionStreamParser } from "../lib/idealy/actions/stream-parser";
import {
  runIdealyActions,
  sortActionsInExecutionOrder,
  type IdealyContainerPort,
} from "../lib/idealy/actions/runner";
import { detectFramework } from "../lib/idealy/actions/framework-detect";
import { decideCorrectionLoop, MAX_CORRECTION_ITERATIONS } from "../lib/idealy/actions/correction-loop";

/* ── D.3 — parsing sur flux partiels ──────────────────────────────────────── */

import type { EmittedAction } from "../lib/idealy/actions/stream-parser";

interface Collected {
  emitted: EmittedAction[];
  warnings: string[];
  containers: string[];
}

function collect(chunks: string[]): Collected {
  const emitted: Collected["emitted"] = [];
  const warnings: string[] = [];
  const containers: string[] = [];
  const parser = new IdealyActionStreamParser({
    onActionComplete: (a) => emitted.push(a),
    onWarning: (w) => warnings.push(w),
    onContainerOpen: (c) => containers.push(c.id),
  });
  for (const chunk of chunks) parser.feed(chunk);
  parser.finish();
  return { emitted, warnings, containers };
}

// 1. Balise ouverte jamais fermée → AUCUNE action émise, warning journalisé.
{
  const { emitted, warnings } = collect([
    '<idealyProject id="p1" title="T"><idealyAction type="file" path="a.txt">contenu partiel',
  ]);
  assert.equal(emitted.length, 0, "une action incomplète ne doit jamais être émise");
  assert.ok(warnings.some((w) => w.includes("action abandonnée")), "le flux coupé doit être signalé");
}

// 2. Coupure AU MILIEU des balises puis reprise → action retrouvée intacte.
{
  const full =
    '<idealyProject id="p2" title="T"><idealyAction type="file" path="src/App.tsx">export default function App(){return null}</idealyAction></idealyProject>';
  const chunks: string[] = [];
  for (let i = 0; i < full.length; i += 7) chunks.push(full.slice(i, i + 7));
  const { emitted, warnings } = collect(chunks);
  assert.equal(emitted.length, 1, "une action ne doit pas se perdre en limite de chunk");
  assert.equal(emitted[0].result.ok, true);
  if (emitted[0].result.ok && emitted[0].result.action.type === "file") {
    assert.equal(emitted[0].result.action.content, "export default function App(){return null}");
    assert.equal(emitted[0].result.action.path, "src/App.tsx");
  }
  // Le chemin src/ est créé par l'action file elle-même (précédence implicite de
  // l'API WebContainer) : le warning « dossier parent manquant » ne doit JAMAIS
  // être émis pour le dossier en cours de création.
  const dirWarnings = warnings.filter((w) => w.includes("parent"));
  assert.equal(dirWarnings.length, 0, `aucun faux warning de précédence : ${dirWarnings.join(" | ")}`);
}

// 3. Deux actions dans un même chunk → les deux émises séparément.
{
  const { emitted } = collect([
    '<idealyProject id="p3" title="T"><idealyAction type="shell">npm install</idealyAction><idealyAction type="start"></idealyAction></idealyProject>',
  ]);
  assert.equal(emitted.length, 2);
  assert.equal(emitted[0].result.ok && emitted[0].result.action.type, "shell");
  assert.equal(emitted[1].result.ok && emitted[1].result.action.type, "start");
}

// 4. Action file VIDE → émise mais REJETÉE (B.4), jamais écrite silencieusement.
{
  const { emitted, warnings } = collect([
    '<idealyProject id="p4" title="T"><idealyAction type="file" path="x.js">   </idealyAction></idealyProject>',
  ]);
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].result.ok, false, "un fichier vide doit être rejeté");
  assert.ok(warnings.some((w) => w.includes("contenu vide")));
}

// 5. Placeholder dans un fichier → rejet explicite.
{
  const outcome = validateIdealyAction({
    type: "file",
    path: "src/big.ts",
    content: "const a = 1;\n// ... reste du code inchangé\n",
  });
  assert.equal(outcome.ok, false);
}

// 6. Type d'action inconnu → ignoré avec warning, jamais exécuté.
{
  const { emitted, warnings } = collect([
    '<idealyProject id="p6" title="T"><idealyAction type="teleport">now</idealyAction></idealyProject>',
  ]);
  assert.equal(emitted.length, 0);
  assert.ok(warnings.some((w) => w.includes("type inconnu")));
}

/* ── C.4 — ordre d'exécution ──────────────────────────────────────────────── */

{
  const direct = sortActionsInExecutionOrder([
    { type: "start" },
    { type: "shell", command: "npm install" },
    { type: "file", path: "b.txt", content: "B" },
    { type: "file", path: "a.txt", content: "A" },
    { type: "rename", from: "x", to: "y" },
    { type: "delete", path: "z" },
  ]);
  assert.deepEqual(direct.map((a) => a.type), ["file", "file", "delete", "rename", "shell", "start"]);
}

/* ── C.1/C.3 — runner séquentiel avec conteneur factice ───────────────────── */

async function testRunner(): Promise<void> {
  const written: Record<string, string> = {};
  const journal: { type: string; payload: Record<string, unknown> }[] = [];
  let failNextShell = false;
  const container: IdealyContainerPort = {
    writeFile: async (p, c) => { written[p] = c; },
    removeFile: async (p) => { delete written[p]; },
    moveFile: async (f, t) => { written[t] = written[f]; delete written[f]; },
    spawn: async (cmd) => {
      if (failNextShell) { failNextShell = false; return { stdout: "", stderr: `boom: ${cmd}`, exitCode: 2 }; }
      return { stdout: `ok: ${cmd}`, stderr: "", exitCode: 0 };
    },
    startDevServer: async () => ({ url: "http://localhost:5173" }),
  };

  // Succès complet : 6 fichiers → 6 actions distinctes validées séparément (critère B).
  // Chaque fichier porte un chemin UNIQUE (le contrat d'API WebContainer impose la
  // précédence parent→enfant : src/f0.ts…/f5.ts sont créés avant toute commande).
  const manyFiles = Array.from({ length: 6 }, (_, i) => ({
    type: "file" as const,
    path: `src/f${i}.ts`,
    content: `export const f${i} = ${i};`,
  }));
  const okResults = await runIdealyActions(
    [...manyFiles, { type: "shell", command: "npm install" }, { type: "start" }],
    { container, events: { append: (e) => {
          journal.push(e);
        } } },
  );
  assert.equal(okResults.filter((r) => r.status === "complete").length, 8, "6 fichiers + shell + start = 8 actions complètes");
  assert.equal(Object.keys(written).length, 6);

  // Échec shell → arrêt immédiat + résultat typé + entrée de journal.
  failNextShell = true;
  const results = await runIdealyActions(
    [
      { type: "file", path: "src/main.ts", content: "console.log(1)" },
      { type: "shell", command: "npm run build" },
      { type: "start" },
    ],
    { container, events: { append: (e) => {
          journal.push(e);
        } } },
  );
  assert.equal(results[0].status, "complete");
  assert.equal(written["src/main.ts"], "console.log(1)", "le contenu réel du conteneur correspond aux actions");
  const failed = results.find((r) => r.status === "failed");
  assert.ok(failed && failed.stderr.includes("boom"), "l'échec remonte stdout/stderr typés");
  assert.equal(results.length, 2, "la séquence s'arrête à l'échec : start n'est pas exécuté");
  assert.ok(journal.some((e) => e.type === "action.failed"), "chaque action a une entrée dans le journal");

  // Fichier dans un dossier manquant → rejet AVANT écriture (précédence parents,
  // contrat API WebContainer : filesystem.writeFile échoue si le dossier parent est absent).
  const missingDirResults = await runIdealyActions(
    [{ type: "file", path: "src/deep/nested/a.ts", content: "x" }],
    { container, events: { append: (e) => {
          journal.push(e);
        } } },
  );
  assert.equal(missingDirResults[0].status, "rejected", "dossier manquant → rejet explicite, jamais d'écriture silencieuse");
  assert.ok(missingDirResults[0].error?.includes("parent"));

  // Deux fichiers même chemin dans une même réponse → le second est signalé doublon.
  const dupResults = await runIdealyActions(
    [
      { type: "file", path: "dup.ts", content: "A" },
      { type: "file", path: "dup.ts", content: "B" },
    ],
    { container, events: { append: (e) => {
          journal.push(e);
        } } },
  );
  assert.ok(dupResults.some((r) => r.status === "rejected" && r.error?.includes("doublon")), "chemin déjà écrit → rejet explicite");
}

/* ── F — détection vite-react ET expo ─────────────────────────────────────── */

{
  const vite = detectFramework({
    "package.json": JSON.stringify({ dependencies: { react: "^19", "react-dom": "^19" }, devDependencies: { vite: "^6" } }),
    "index.html": "<!doctype html>",
  });
  assert.equal(vite.framework, "vite-react");
  assert.equal(vite.devCommand, "npm run dev");

  const expo = detectFramework({
    "package.json": JSON.stringify({ dependencies: { expo: "~51.0.0", "react-native": "*" } }),
    "app.json": "{}",
  });
  assert.equal(expo.framework, "expo");
  assert.ok(expo.validateCommand.includes("tsc"), "Expo valide par typecheck, pas par bundler web");
}

/* ── E — budget anti-boucle : 3 échecs → blocked ──────────────────────────── */

{
  const failing = {
    command: "npm run build",
    exitCode: 1,
    issues: [{ file: "src/a.ts", line: 1, column: 1, message: "TS2304 cannot find name 'x'" }],
  };
  let completed = 0;
  let decision = decideCorrectionLoop(failing, completed, 100);
  const feedbacks: string[] = [];
  while (decision.action === "retry") {
    feedbacks.push(decision.feedbackToModel);
    completed = decision.iteration;
    decision = decideCorrectionLoop(failing, completed, 100);
  }
  assert.equal(decision.action, "blocked");
  // Convention du dépôt (cf. test:reviewer-loop) : MAX_REVIEW_ITERATIONS = nombre
  // max d'échecs consécutifs tolérés. Ici : 1 pass initial + 3 retries = 4 échecs.
  assert.equal(completed, MAX_CORRECTION_ITERATIONS);
  assert.equal(feedbacks.length, MAX_CORRECTION_ITERATIONS, "exactement 3 tours de correction");
  assert.ok(feedbacks[0]?.includes("TS2304"), "le modèle reçoit l'erreur RÉELLE du terminal");
  assert.equal(decideCorrectionLoop(failing, 1, 0).action, "blocked", "crédits épuisés → bloqué, zéro consommation");
  assert.equal(decideCorrectionLoop({ command: "x", exitCode: 0, issues: [] }, 1, 50).action, "pass");
}

void testRunner().then(() => {
  console.log("Idealy actions protocol contract verified. ✓");
});
