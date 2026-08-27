import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [hook, streamHandler, artifact, topBar, localDemo] = await Promise.all([
  readFile("hooks/use-active-chat.tsx", "utf8"),
  readFile("components/chat/data-stream-handler.tsx", "utf8"),
  readFile("components/chat/artifact.tsx", "utf8"),
  readFile("components/chat/build-top-bar.tsx", "utf8"),
  readFile("lib/idealy/local-workspace-demo.ts", "utf8"),
]);

assert.match(hook, /if \(!isDemoMode\) \{\s*return sendRemoteMessage/);
assert.match(hook, /setDataStream\(localWorkspaceDataStream\(\)\)/);
assert.match(streamHandler, /if \(isDemoMode \|\| !missionId/);
assert.match(artifact, /artifact\.documentId !== "init" && artifact\.status !== "streaming" && !isDemoMode/);
assert.match(artifact, /missionId && !isDemoMode/);
assert.match(topBar, /if \(isDemoMode\) \{/);
assert.match(topBar, /Démo locale : publication protégée/);
assert.match(localDemo, /LOCAL_DEMO_MISSION_ID/);
assert.match(localDemo, /data-idealy-file-event/);
assert.doesNotMatch(localDemo, /fetch\s*\(/);

console.log("Local workspace demo contract passed.");
