import assert from "node:assert/strict";
import { demoMissionSteps, demoPaths, getDemoPath } from "../lib/idealy/demo-program";

assert.equal(demoPaths.length, 4, "The demo must include four progression paths.");
assert.equal(new Set(demoPaths.map((path) => path.id)).size, 4);
assert.ok(demoPaths.every((path) => path.agents.length === 3));
assert.ok(demoPaths.every((path) => path.agents.every((agent) => agent.initials.length === 2)));
assert.equal(demoMissionSteps.length, 4, "The mission should expose four concrete steps.");
assert.equal(getDemoPath("mage").name, "Voie Mage");

console.log("Demo multi-agent program contract passed.");
