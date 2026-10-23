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
const missionPlanning = await readFile(new URL("../lib/idealy/backend-adapter.ts", import.meta.url), "utf8");
const edgeChatTools = await readFile(new URL("../supabase/functions/process-ai-request/chatTools.ts", import.meta.url), "utf8");
const edgeToolCalling = await readFile(new URL("../supabase/functions/process-ai-request/toolCalling.ts", import.meta.url), "utf8");
const edgeRequest = await readFile(new URL("../supabase/functions/process-ai-request/index.ts", import.meta.url), "utf8");

assert.match(schema, /new URL\(value\)\.protocol === "https:"/, "Les pièces jointes doivent utiliser HTTPS.");
assert.match(schema, /parts: z\.array\(partSchema\)\.min\(1\)\.max\(8\)/, "Le nombre de parties d’un message utilisateur doit être borné.");
assert.match(schema, /messages: z\.array\(toolApprovalMessageSchema\)\.max\(30\)\.optional\(\)/, "Le flux d’approbation ne doit pas accepter une liste illimitée.");
assert.match(schema, /selectedChatModel: z\.string\(\)\.min\(1\)\.max\(160\)/, "L’identifiant de modèle doit être borné.");
assert.match(route, /const supportsFileContents =\s*capabilities\?\.vision === true[\s\S]*?mediaType === "application\/pdf"/, "Le serveur ne doit transmettre le contenu que pour les formats réellement lisibles par le modèle sélectionné.");
assert.match(route, /if \(supportsFileContents\) return \[part\]/, "Les images et PDF restent transmis aux modèles qui annoncent la vision.");
assert.match(route, /Le modèle choisi ne peut pas lire le contenu de ce format[\s\S]*?L’original reste joint et téléchargeable/, "Les formats non lisibles doivent rester attachés sans prétendre qu’ils ont été analysés.");
assert.doesNotMatch(input, /data-testid="model-selector"/, "Le modèle doit être sélectionné automatiquement sans sélecteur visible.");
assert.match(route, /const chatModel = DEFAULT_CHAT_MODEL/, "Le chat doit appliquer le modèle serveur par défaut.");
assert.match(route, /part\.type !== "file"[\s\S]*?Fichier joint[\s\S]*?contenu binaire[\s\S]*?n’est pas transmis/, "Le moteur de production doit recevoir une description honnête des pièces jointes qu’il ne peut pas lire.");

assert.match(types, /searchImages: searchImagesTool/, "Pexels search results must be part of the chat message type contract.");
assert.match(route, /getMissionAgentRoster\(userWay\)/, "The @agent mention must be validated against the active Way roster.");
assert.match(route, /requestedAgent,/, "The explicit responder must flow through the production chat path.");
assert.match(missionPlanning, /requestedAgent\?: string \| null/, "Mission planning must accept an explicit responder.");
assert.match(missionPlanning, /explicitly selected @/, "The mission planner must receive the explicit responder instruction.");
assert.match(missionPlanApi, /dna: updatedDna/, "An edited plan must be written to the persisted orchestration context.");
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
assert.match(edgeRequest, /createToolEnabledChatResponse/, "The production Supabase Edge route must support real tool calls.");
assert.match(edgeRequest, /shouldUseChatTools\(prompt\)/, "Production tool execution must be selected for research and media prompts.");
assert.match(edgeRequest, /input\.workspaceStream && input\.missionId/, "Tool calling must preserve the strict workspace file-stream path.");
for (const expected of ["webSearch", "searchImages", "generateImage", "https://api.exa.ai/search", "https://api.pexels.com/v1/search", "https://fal.run/fal-ai/flux/schnell", "EXA_API_KEY", "PEXELS_API_KEY", "FAL_KEY"]) {
  assert.ok(edgeChatTools.includes(expected), `The production chat tools backend is missing ${expected}.`);
}
assert.match(edgeChatTools, /httpsUrl/, "Tool results must validate external URLs before they reach the UI.");
assert.match(edgeToolCalling, /MAX_TOOL_EXECUTIONS = 3/, "Tool execution must be bounded to avoid uncontrolled tool loops.");
assert.match(edgeToolCalling, /MAX_TOOL_ROUNDS = 2/, "Tool calls must have a bounded multi-round loop.");
assert.match(edgeToolCalling, /state: "input-available"/, "A real tool call must publish an in-progress event.");
assert.match(edgeToolCalling, /state: finalState/, "A completed tool call must publish its real result state.");
assert.match(route, /parsed\.type === "idealy_tool_activity"/, "The production stream adapter must forward real tool activity.");
assert.match(route, /data-idealy-tool-activity/, "Tool activity must enter the typed UI message stream.");
assert.match(types, /"idealy-tool-activity": IdealyChatToolActivity/, "The custom stream event must have a typed UI contract.");
assert.match(message, /type === "data-idealy-tool-activity"/, "The chat must render Edge tool activity cards.");
assert.match(activityCard, /open=\{isOpen\} onOpenChange=\{setIsOpen\}/, "Tool cards must be manually collapsible after completion.");
assert.match(activityCard, /setIsOpen\(!isTerminal\)/, "Tool cards must auto-collapse when the real result arrives.");

console.log("Chat request contract passed.");
