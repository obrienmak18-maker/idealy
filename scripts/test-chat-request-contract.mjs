import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const schema = await readFile(
  new URL("../app/(chat)/api/chat/schema.ts", import.meta.url),
  "utf8"
);

assert.match(schema, /new URL\(value\)\.protocol === "https:"/, "Les pièces jointes doivent utiliser HTTPS.");
assert.match(schema, /parts: z\.array\(partSchema\)\.min\(1\)\.max\(8\)/, "Le nombre de parties d’un message utilisateur doit être borné.");
assert.match(schema, /messages: z\.array\(toolApprovalMessageSchema\)\.max\(30\)\.optional\(\)/, "Le flux d’approbation ne doit pas accepter une liste illimitée.");
assert.match(schema, /selectedChatModel: z\.string\(\)\.min\(1\)\.max\(160\)/, "L’identifiant de modèle doit être borné.");

console.log("Chat request contract passed.");
