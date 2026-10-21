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
const types = await readFile(new URL("../lib/types.ts", import.meta.url), "utf8");
const message = await readFile(new URL("../components/chat/message.tsx", import.meta.url), "utf8");
const activityCard = await readFile(new URL("../components/chat/tool-activity-card.tsx", import.meta.url), "utf8");
const toolHeader = await readFile(new URL("../components/ai-elements/tool.tsx", import.meta.url), "utf8");
const missionPlan = await readFile(new URL("../components/chat/mission-plan-card.tsx", import.meta.url), "utf8");
const missionPlanApi = await readFile(new URL("../app/api/idealy/missions/[missionId]/plan/route.ts", import.meta.url), "utf8");

assert.match(schema, /new URL\(value\)\.protocol === "https:"/, "Les pièces jointes doivent utiliser HTTPS.");
assert.match(schema, /parts: z\.array\(partSchema\)\.min\(1\)\.max\(8\)/, "Le nombre de parties d’un message utilisateur doit être borné.");
assert.match(schema, /messages: z\.array\(toolApprovalMessageSchema\)\.max\(30\)\.optional\(\)/, "Le flux d’approbation ne doit pas accepter une liste illimitée.");
assert.match(schema, /selectedChatModel: z\.string\(\)\.min\(1\)\.max\(160\)/, "L’identifiant de modèle doit être borné.");
assert.match(route, /const supportsFileContents =\s*capabilities\?\.vision === true[\s\S]*?mediaType === "application\/pdf"/, "Le serveur ne doit transmettre le contenu que pour les formats réellement lisibles par le modèle sélectionné.");
assert.match(route, /if \(supportsFileContents\) return \[part\]/, "Les images et PDF restent transmis aux modèles qui annoncent la vision.");
assert.match(route, /Le modèle choisi ne peut pas lire le contenu de ce format[\s\S]*?L’original reste joint et téléchargeable/, "Les formats non lisibles doivent rester attachés sans prétendre qu’ils ont été analysés.");
assert.match(input, /capabilities\?\.\[model\.id\]\?\.vision/, "Le sélecteur doit exposer les capacités de vision réelles du modèle.");
assert.match(route, /part\.type !== "file"[\s\S]*?Fichier joint[\s\S]*?contenu binaire[\s\S]*?n’est pas transmis/, "Le moteur de production doit recevoir une description honnête des pièces jointes qu’il ne peut pas lire.");

assert.match(types, /searchImages: searchImagesTool/, "Pexels search results must be part of the chat message type contract.");
assert.match(types, /generateImage: generateImageTool/, "Generated image results must be part of the chat message type contract.");
assert.match(types, /webSearch: webSearchTool/, "Web search results must be part of the chat message type contract.");
assert.match(types, /executeSandbox: executeSandboxTool/, "Sandbox execution results must be part of the chat message type contract.");
assert.match(message, /type === "tool-webSearch"/, "Web search tool activity must be rendered in the chat.");
assert.match(message, /type === "tool-searchImages"/, "Pexels search tool activity must be rendered in the chat.");
assert.match(message, /type === "tool-generateImage"/, "Generated image tool activity must be rendered in the chat.");
assert.match(message, /type === "tool-executeSandbox"/, "Sandbox output must be rendered in the chat.");
assert.match(activityCard, /safeHttpUrl/, "Tool result links must reject non-HTTP(S) destinations.");
assert.match(activityCard, /photos/, "Image search results must show real returned photos.");
assert.match(activityCard, /stdout/, "Sandbox activity must render actual execution output.");
assert.match(toolHeader, /rawName === "webSearch" \? Search/, "Tool cards must use a context-specific search icon.");
assert.match(missionPlan, /Valider et lancer/, "Mission launch requires a clear approval action.");
assert.match(missionPlan, /beginEditing/, "The mission plan must be editable before launch.");
assert.match(missionPlanApi, /export async function PATCH/, "Plan edits must be persisted through a real API endpoint.");
assert.match(missionPlanApi, /user_id=eq\./, "Plan editing must be scoped to the authenticated mission owner.");

console.log("Chat request contract passed.");
