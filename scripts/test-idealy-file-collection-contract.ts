/**
 * Contrat LOT J : carte de fichiers typée + diff exact + suppression explicite journalisée.
 * Mécanisme inspiré chat_to_files / files_dict de gpt-engineer (MIT) — réécriture TS Idealy.
 */
import {
  type FileMap,
  type FileMapEntry,
  diffFileMap,
  versCarteFichiers,
  serialiserCarte,
  parserCarteDepuisJournal,
} from "../lib/idealy/actions/file-collection";

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`✗ ${msg}`);
    process.exit(1);
  }
}

const avant: FileMap = {
  "src/App.tsx": { content: "export default function App(){return null}", deleted: false },
  "src/utils.ts": { content: "export const a = 1;", deleted: false },
  "legacy.ts": { content: "// obsolete", deleted: false },
};

// Sortie modèle → carte (J.1/J.2) : un bloc balisé par fichier.
const sortieModele = [
  '<fichier chemin="src/App.tsx">',
  "export default function App(){return <h1>ok</h1>}",
  "</fichier>",
  '<fichier chemin="src/nouveau.ts">',
  "export const n = 2;",
  "</fichier>",
].join("\n");
const carte = versCarteFichiers(sortieModele);
assert(carte["src/App.tsx"]?.content.includes("<h1>ok</h1>"), "modification non convertie");
assert(carte["src/nouveau.ts"] !== undefined, "ajout non converti");

// Fusion incrémentale : seuls les fichiers mentionnés changent (J objectif).
const fusionne: FileMap = { ...avant };
for (const [p, e] of Object.entries(carte)) fusionne[p] = e;
fusionne["legacy.ts"] = { content: "", deleted: true, deleteReason: 'obsolescence confirmee par le client' };

const d = diffFileMap(avant, fusionne);
assert(d.added.length === 1 && d.added[0] === "src/nouveau.ts", `added faux : ${JSON.stringify(d.added)}`);
assert(d.modified.length === 1 && d.modified[0] === "src/App.tsx", `modified faux : ${JSON.stringify(d.modified)}`);
assert(d.deleted.length === 1 && d.deleted[0] === "legacy.ts", `deleted faux : ${JSON.stringify(d.deleted)}`);
assert(d.unchanged.length === 1 && d.unchanged[0] === "src/utils.ts", "src/utils.ts ne doit PAS être touché");

// J.4 — suppression sans raison explicite = rejet en erreur.
let leve = false;
try {
  diffFileMap(avant, { ...avant, "legacy.ts": { content: "", deleted: true } });
} catch {
  leve = true;
}
assert(leve, "suppression sans deleteReason doit lever une erreur");
const entreeValide: FileMapEntry = { content: "", deleted: true, deleteReason: "test" };
assert(entreeValide.deleteReason === "test", "deleteReason porte la raison");

// J.3 — persistance : sérialisation → parse → identité (survit au rechargement).
const json = serialiserCarte(fusionne);
const rejoue = parserCarteDepuisJournal(json);
assert(JSON.stringify(rejoue) === JSON.stringify(fusionne), "carte ne survit pas au round-trip journal");
assert(rejoue["legacy.ts"].deleteReason === 'obsolescence confirmee par le client', "raison de suppression perdue");

console.log("Idealy incremental file-map contract verified (add/modify/delete/no-touch/persist). ✓");
