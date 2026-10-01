/**
 * test-canvas-lifecycle-contract.mjs
 *
 * Verifies Phase 4 constraints:
 *   1. artifact.tsx derives overlay phases dynamically from missionSquadStatus and missionFileStatus
 *   2. artifact.tsx console header exposes truthful states (Building, Reviewing, Correcting, Ready, Error)
 *   3. artifact.tsx build tab displays structured lifecycle log reflecting squad progression
 *   4. data-stream-handler.tsx translates VFS file events to missionSquadStatus updates in metadata
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// ─── 1. Artifact overlay & console status ────────────────────────────────────
const artifact = read("components/chat/artifact.tsx");

assert.match(
  artifact,
  /metadata\?\.missionSquadStatus/,
  "artifact.tsx must read missionSquadStatus for dynamic phase derivation"
);

assert.match(
  artifact,
  /metadata\?\.missionFileStatus/,
  "artifact.tsx must read missionFileStatus for dynamic phase derivation"
);

assert.match(
  artifact,
  /"auto_correction_started"/,
  "artifact.tsx must handle auto_correction_started phase"
);

assert.match(
  artifact,
  /Correction automatique en cours/,
  "artifact.tsx overlay must display auto-correction details when correcting"
);

assert.match(
  artifact,
  /Reviewer — validation structurelle/,
  "artifact.tsx build tab must represent Reviewer validation phase"
);

assert.match(
  artifact,
  /Correcting/,
  "artifact.tsx console header must include Correcting state badge"
);

assert.match(
  artifact,
  /Reviewing/,
  "artifact.tsx console header must include Reviewing state badge"
);

// ─── 2. Data stream handler squad status propagation ─────────────────────────
const streamHandler = read("components/chat/data-stream-handler.tsx");

assert.match(
  streamHandler,
  /nextSquadStatus = "ready"/,
  "data-stream-handler must set missionSquadStatus to 'ready' on mission_completed"
);

assert.match(
  streamHandler,
  /nextSquadStatus = "needs-fix"/,
  "data-stream-handler must set missionSquadStatus to 'needs-fix' on mission_error"
);

assert.match(
  streamHandler,
  /nextSquadStatus = "auto_correction_started"/,
  "data-stream-handler must set missionSquadStatus to 'auto_correction_started'"
);

assert.match(
  streamHandler,
  /missionSquadStatus:\s*nextSquadStatus/,
  "data-stream-handler must propagate nextSquadStatus to metadata"
);

console.log("Canvas lifecycle contract verified. ✓");
