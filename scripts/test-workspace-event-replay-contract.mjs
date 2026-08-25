import { readFile } from "node:fs/promises";

const [adapter, route] = await Promise.all([
  readFile("lib/idealy/backend-adapter.ts", "utf8"),
  readFile("app/api/idealy/missions/[missionId]/events/route.ts", "utf8"),
]);
const streamHandler = await readFile(
  "components/chat/data-stream-handler.tsx",
  "utf8"
);

for (const requiredFragment of [
  "mission_file_events?select=",
  "sequence=gt.${afterSequence}",
  "order=sequence.asc",
  "limit=100",
  "mission_files?select=",
  "order=path.asc,version.desc",
]) {
  if (!adapter.includes(requiredFragment)) {
    throw new Error(`Workspace replay adapter is missing: ${requiredFragment}`);
  }
}

for (const requiredFragment of [
  "await auth()",
  "Invalid mission id",
  "Invalid afterSequence",
  "lastSequence",
  "files",
  '"Cache-Control": "no-store"',
]) {
  if (!route.includes(requiredFragment)) {
    throw new Error(`Workspace replay route is missing: ${requiredFragment}`);
  }
}

for (const requiredFragment of [
  "Mission workspace",
  "missionFiles.length",
  "data-idealy-file-event",
  "isVisible: true",
]) {
  if (!streamHandler.includes(requiredFragment)) {
    throw new Error(`Workspace canvas recovery is missing: ${requiredFragment}`);
  }
}

console.log("Workspace event replay contract passed.");
