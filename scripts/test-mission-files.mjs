import assert from "node:assert/strict";
import { languageFromMissionFilePath, normalizeMissionFilePath } from "../lib/idealy/mission-files.ts";

assert.equal(normalizeMissionFilePath("./src/App.tsx"), "src/App.tsx");
assert.equal(normalizeMissionFilePath("src\\components\\Button.tsx"), "src/components/Button.tsx");
assert.equal(languageFromMissionFilePath("src/App.tsx"), "tsx");
assert.equal(languageFromMissionFilePath("package.json"), "json");

for (const invalidPath of ["", "/etc/passwd", "../secret", "src/../secret"]) {
  assert.throws(() => normalizeMissionFilePath(invalidPath));
}

console.log(JSON.stringify({ checks: 6, status: "ok" }));
