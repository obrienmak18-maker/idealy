import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const uploadRoute = await readFile(
  new URL("../app/(chat)/api/files/upload/route.ts", import.meta.url),
  "utf8"
);
const documentRoute = await readFile(
  new URL("../app/(chat)/api/document/route.ts", import.meta.url),
  "utf8"
);

assert.match(
  uploadRoute,
  /const pathname = `uploads\/\$\{ownerSegment\}\/\$\{crypto\.randomUUID\(\)\}\.\$\{extension\}`;/,
  "Les imports doivent être isolés par utilisateur et recevoir un nom non prédictible."
);
assert.doesNotMatch(
  uploadRoute,
  /put\(`\$\{safeName\}`/,
  "Les imports ne doivent plus utiliser le nom de fichier fourni par le client comme chemin global."
);
assert.match(
  documentRoute,
  /if \(!document\) \{\s*return new ChatbotError\("not_found:document"\)\.toResponse\(\);\s*\}/,
  "La suppression d’un document absent doit répondre 404 sans dereferencer une valeur indéfinie."
);
assert.match(documentRoute, /content: z\.string\(\)\.max\(1_000_000\)/, "Les écritures de document doivent être bornées.");
assert.match(documentRoute, /title: z\.string\(\)\.min\(1\)\.max\(240\)/, "Les titres de document doivent être bornés.");

console.log("Legacy API security contract passed.");
