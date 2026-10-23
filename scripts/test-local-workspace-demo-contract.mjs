import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [hook, streamHandler, artifact, topBar, localDemo] = await Promise.all([
  readFile("hooks/use-active-chat.tsx", "utf8"),
  readFile("components/chat/data-stream-handler.tsx", "utf8"),
  readFile("components/chat/artifact.tsx", "utf8"),
  readFile("components/chat/build-top-bar.tsx", "utf8"),
  readFile("lib/idealy/local-workspace-demo.ts", "utf8"),
]);
const suggestedActions = await readFile("components/chat/suggested-actions.tsx", "utf8");
const nextConfig = await readFile("next.config.ts", "utf8");
const chatLayout = await readFile("app/(chat)/layout.tsx", "utf8");
const chatComposer = await readFile("components/chat/multimodal-input.tsx", "utf8");
const cookieNotice = await readFile("components/cookies/cookie-notice.tsx", "utf8");

assert.match(hook, /if \(!isDemoMode\) \{\s*return sendRemoteMessage/);
assert.match(hook, /setDataStream\(localWorkspaceDataStream\(\)\)/);
assert.match(streamHandler, /if\s*\(\s*isDemoMode\s*\|\|\s*!missionId/);
assert.match(artifact, /artifact\.documentId !== "init" && artifact\.status !== "streaming" && !isDemoMode/);
assert.match(artifact, /missionId && !isDemoMode/);
assert.match(topBar, /if \(isDemoMode\) \{/);
assert.match(topBar, /Démo locale : publication protégée/);
assert.match(suggestedActions, /start-local-workspace-demo/);
assert.match(suggestedActions, /Ouvrir la démonstration complète/);
assert.match(localDemo, /LOCAL_DEMO_MISSION_ID/);
assert.match(localDemo, /data-idealy-file-event/);
assert.match(nextConfig, /const explicitClientDemoMode = process\.env\.NEXT_PUBLIC_DEMO_MODE\?\.trim\(\)/);
assert.match(nextConfig, /explicitClientDemoMode === "true" \|\| explicitClientDemoMode === "false"/);
assert.match(nextConfig, /NEXT_PUBLIC_DEMO_MODE: clientDemoMode/);
assert.match(chatLayout, /const isLocalDemo =/);
assert.match(chatLayout, /isLocalDemo \? Promise\.resolve\(null\) : auth\(\)/);
assert.ok(chatComposer.includes('data-testid="multimodal-input"'), "The real chat composer must remain available.");
assert.ok(!chatComposer.includes("<ModelSelectorCompact"), "Model selection must stay automatic and hidden.");
assert.doesNotMatch(chatComposer, /selectedModelId=\{selectedModelId\}/, "The composer must not require a visible model selector.");
assert.ok(cookieNotice.includes('isChatWorkspace ? "bottom-44" : "bottom-4"'));
assert.doesNotMatch(localDemo, /fetch\s*\(/);

console.log("Local workspace demo contract passed.");
