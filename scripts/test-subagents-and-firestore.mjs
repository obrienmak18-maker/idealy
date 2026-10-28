import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function run() {
  console.log("Testing subagents & Firestore integration contracts...");

  const files = {
    dispatchSubagents: await readFile("lib/ai/tools/dispatch-subagents.ts", "utf8"),
    firestoreSync: await readFile("lib/firebase/firestore-sync.ts", "utf8"),
    firebaseAdmin: await readFile("lib/firebase/admin.ts", "utf8"),
    chatRoute: await readFile("app/(chat)/api/chat/route.ts", "utf8"),
    types: await readFile("lib/types.ts", "utf8"),
    prompts: await readFile("lib/ai/prompts.ts", "utf8"),
    createDocument: await readFile("lib/ai/tools/create-document.ts", "utf8"),
    toolActivityCard: await readFile("components/chat/tool-activity-card.tsx", "utf8"),
    multiAgentRelay: await readFile("components/chat/multi-agent-relay.tsx", "utf8"),
    dataStreamHandler: await readFile("components/chat/data-stream-handler.tsx", "utf8"),
  };

  // 1. Dispatch SubAgents tool contract
  assert.match(files.dispatchSubagents, /export const dispatchSubAgents/);
  assert.match(files.dispatchSubagents, /dataStream\.write\(\{/);
  assert.match(files.dispatchSubagents, /type: "data-idealy-subagent"/);
  assert.match(files.dispatchSubagents, /status: "success"/);
  assert.match(files.dispatchSubagents, /subAgentSchema/);

  // 2. Types contract
  assert.match(files.types, /dispatchSubAgentsTool/);
  assert.match(files.types, /dispatchSubAgents: dispatchSubAgentsTool;/);
  assert.match(files.types, /export type IdealySubAgentEvent = \{/);
  assert.match(files.types, /"idealy-subagent": IdealySubAgentEvent;/);
  assert.match(files.types, /"dispatchSubAgents"/);

  // 3. Chat route registration
  assert.ok(files.chatRoute.includes('import { dispatchSubAgents } from "@/lib/ai/tools/dispatch-subagents";'));
  assert.match(files.chatRoute, /"dispatchSubAgents"/);
  assert.match(files.chatRoute, /dispatchSubAgents: dispatchSubAgents\(\{ dataStream \}\)/);

  // 4. Firestore Live Sync module contract
  assert.match(files.firestoreSync, /export async function syncProjectToFirestoreServer/);
  assert.match(files.firestoreSync, /export async function syncChatSnapshotToFirestoreServer/);
  assert.match(files.firestoreSync, /idealy_projects/);
  assert.match(files.firestoreSync, /idealy_chats/);
  assert.match(files.firestoreSync, /isFirebaseAdminConfigured/);
  assert.match(files.firebaseAdmin, /export function getAdminApp\(\): App/);

  // 5. Additive non-blocking hook in createDocument
  assert.match(files.createDocument, /import\("@\/lib\/firebase\/firestore-sync"\)/);
  assert.match(files.createDocument, /syncProjectToFirestoreServer\(\{/);

  // 6. Tool Activity Card and UI
  assert.match(files.toolActivityCard, /dispatchSubAgents/);
  assert.match(files.toolActivityCard, /SubAgentCard/);
  assert.match(files.toolActivityCard, /squadObjective/);
  assert.match(files.multiAgentRelay, /idealy:subagents-updated/);
  assert.match(files.multiAgentRelay, /Sous-agents mobilisés en parallèle/);
  assert.match(files.dataStreamHandler, /delta\.type === "data-idealy-subagent"/);

  // 7. Prompts contract
  assert.match(files.prompts, /dispatchSubAgents/);
  assert.match(files.prompts, /dispatchSubAgents.*createDocument/);

  console.log("Subagents and Firestore contract tests passed cleanly! ✓ (25/25 checks)");
}

run().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
