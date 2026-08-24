import assert from "node:assert/strict";
import {
  languageFromMissionFilePath,
  mergeMissionFileEvent,
  normalizeMissionFilePath,
} from "../lib/idealy/mission-files.ts";

assert.equal(normalizeMissionFilePath("./src/App.tsx"), "src/App.tsx");
assert.equal(normalizeMissionFilePath("src\\components\\Button.tsx"), "src/components/Button.tsx");
assert.equal(languageFromMissionFilePath("src/App.tsx"), "tsx");
assert.equal(languageFromMissionFilePath("package.json"), "json");

for (const invalidPath of ["", "/etc/passwd", "../secret", "src/../secret"]) {
  assert.throws(() => normalizeMissionFilePath(invalidPath));
}

const firstEvent = {
  eventType: "file_saved",
  file: {
    content: "export default function App() {}",
    missionId: "00000000-0000-4000-8000-000000000001",
    path: "src/App.tsx",
    status: "saved",
    version: 1,
  },
  missionId: "00000000-0000-4000-8000-000000000001",
  sequence: 1,
};
const afterFirst = mergeMissionFileEvent({ files: [], lastSequence: 0 }, firstEvent);
const afterDuplicate = mergeMissionFileEvent(afterFirst, firstEvent);
assert.equal(afterFirst.files.length, 1);
assert.equal(afterDuplicate.files.length, 1);
assert.equal(afterDuplicate.lastSequence, 1);

console.log(JSON.stringify({ checks: 9, status: "ok" }));
