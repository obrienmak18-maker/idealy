import assert from "node:assert/strict";
import {
  demoMissionSteps,
  demoPaths,
  getDemoPath,
  getPathAgent,
  resourceForStep,
} from "../lib/idealy/demo-program";

assert.equal(demoPaths.length, 4, "The demo must include four progression paths.");
assert.equal(new Set(demoPaths.map((path) => path.id)).size, 4);
assert.ok(demoPaths.every((path) => path.agents.length >= 1));
assert.ok(demoPaths.every((path) => path.agents.every((agent) => agent.initials.length === 2)));
assert.ok(demoPaths.every((path) => path.agents.every((agent) => agent.avatarUrl || agent.initials.length === 2)));
assert.ok(demoPaths.every((path) => path.resource.initial > 0));
assert.equal(demoMissionSteps.length, 5, "The mission should expose five concrete steps.");
assert.equal(getDemoPath("mage").name, "Voie Mage");
assert.equal(getPathAgent(getDemoPath("hunter"), demoMissionSteps[3]).name, "Netero");
assert.ok(resourceForStep(getDemoPath("ninja"), 2) < getDemoPath("ninja").resource.initial);
assert.equal(getDemoPath("professional").agents.length, 5, "Professional should have an operational squad.");
assert.equal(getDemoPath("professional").levels?.length, 5, "Professional should expose five operation levels.");
assert.equal(getDemoPath("professional").levels?.[0]?.title, "Niveau 1 · Triage");

console.log("Demo multi-agent program contract passed.");
