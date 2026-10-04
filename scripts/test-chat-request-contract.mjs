import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const schema = await readFile(
  new URL("../app/(chat)/api/chat/schema.ts", import.meta.url),
  "utf8"
);
const route = await readFile(
  new URL("../app/(chat)/api/chat/route.ts", import.meta.url),
  "utf8"
);
const input = await readFile(
  new URL("../components/chat/multimodal-input.tsx", import.meta.url),
  "utf8"
);

assert.match(schema, /new URL\(value\)\.protocol === "https:"/, "Les pièces jointes doivent utiliser HTTPS.");
assert.match(schema, /parts: z\.array\(partSchema\)\.min\(1\)\.max\(8\)/, "Le nombre de parties d’un message utilisateur doit être borné.");
assert.match(schema, /messages: z\.array\(toolApprovalMessageSchema\)\.max\(30\)\.optional\(\)/, "Le flux d’approbation ne doit pas accepter une liste illimitée.");
assert.match(schema, /selectedChatModel: z\.string\(\)\.min\(1\)\.max\(160\)/, "L’identifiant de modèle doit être borné.");
assert.match(route, /const supportsFileContents =\s*capabilities\?\.vision === true[\s\S]*?mediaType === "application\/pdf"/, "Le serveur ne doit transmettre le contenu que pour les formats réellement lisibles par le modèle sélectionné.");
assert.match(route, /if \(supportsFileContents\) return \[part\]/, "Les images et PDF restent transmis aux modèles qui annoncent la vision.");
assert.match(route, /Le modèle choisi ne peut pas lire le contenu de ce format[\s\S]*?L’original reste joint et téléchargeable/, "Les formats non lisibles doivent rester attachés sans prétendre qu’ils ont été analysés.");
assert.match(input, /capabilities\?\.\[model\.id\]\?\.vision/, "Le sélecteur doit exposer les capacités de vision réelles du modèle.");
assert.match(route, /part\.type !== "file"[\s\S]*?Fichier joint[\s\S]*?contenu binaire[\s\S]*?n’est pas transmis/, "Le moteur de production doit recevoir une description honnête des pièces jointes qu’il ne peut pas lire.");

console.log("Chat request contract passed.");
