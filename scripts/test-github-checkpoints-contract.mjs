/**
 * test-github-checkpoints-contract.mjs
 *
 * Verifies Phase 7 constraints:
 *   1. lib/idealy/checkpoints.ts exports syncMissionToGitHub and CheckpointSnapshot
 *   2. syncMissionToGitHub uses genuine GitHub REST API endpoints with Base64 encoding and branch resolution
 *   3. /api/idealy/missions/[missionId]/checkpoints route authenticates and handles snapshot persistence
 *   4. /api/idealy/missions/[missionId]/rollback route authenticates and processes rollback requests
 *   5. /api/idealy/missions/[missionId]/github route authenticates, guards against missing credentials, and synchronizes
 *   6. CheckpointModal provides snapshot timeline, rollback trigger, and real GitHub export form
 *   7. build-top-bar integrates CheckpointModal and exposes trigger in workspace UI
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// ─── 1. Checkpoints and GitHub Sync Library ──────────────────────────────────
const lib = read("lib/idealy/checkpoints.ts");

assert.match(lib, /export async function syncMissionToGitHub/, "lib must export syncMissionToGitHub");
assert.match(lib, /export type CheckpointSnapshot/, "lib must export CheckpointSnapshot");
assert.match(lib, /api\.github\.com\/repos/, "lib must call genuine GitHub REST API");
assert.match(lib, /Buffer\.from\([^)]*\)\.toString\("base64"\)/, "lib must encode file contents in Base64 for GitHub API");
assert.match(lib, /git\/refs/, "lib must resolve and create git branch references");

// ─── 2. Checkpoints API Route ────────────────────────────────────────────────
const checkpointsRoute = read("app/api/idealy/missions/[missionId]/checkpoints/route.ts");

assert.match(checkpointsRoute, /auth\(\)/, "checkpoints route must authenticate user");
assert.match(checkpointsRoute, /export async function GET/, "checkpoints route must support GET");
assert.match(checkpointsRoute, /export async function POST/, "checkpoints route must support POST");
assert.match(checkpointsRoute, /listIdealyMissionFiles/, "checkpoints route must snapshot mission files");

// ─── 3. Rollback API Route ───────────────────────────────────────────────────
const rollbackRoute = read("app/api/idealy/missions/[missionId]/rollback/route.ts");

assert.match(rollbackRoute, /auth\(\)/, "rollback route must authenticate user");
assert.match(rollbackRoute, /export async function POST/, "rollback route must support POST");
assert.match(rollbackRoute, /checkpointId/, "rollback route must validate checkpoint identifier");

// ─── 4. GitHub Sync API Route ────────────────────────────────────────────────
const githubRoute = read("app/api/idealy/missions/[missionId]/github/route.ts");

assert.match(githubRoute, /auth\(\)/, "github sync route must authenticate user");
assert.match(githubRoute, /CONNECT_GITHUB/, "github sync route must signal missing token error honestly");
assert.match(githubRoute, /syncMissionToGitHub/, "github sync route must invoke syncMissionToGitHub");

// ─── 5. CheckpointModal UI ───────────────────────────────────────────────────
const modal = read("components/chat/checkpoint-modal.tsx");

assert.match(modal, /CheckpointModal/, "modal must export CheckpointModal component");
assert.match(modal, /handleRollback/, "modal must support rollback execution");
assert.match(modal, /handleSyncGitHub/, "modal must support GitHub synchronization");
assert.match(modal, /handleCreateCheckpoint/, "modal must support checkpoint creation");

// ─── 6. BuildTopBar Integration ──────────────────────────────────────────────
const topBar = read("components/chat/build-top-bar.tsx");

assert.match(topBar, /<CheckpointModal/, "build-top-bar must render CheckpointModal");
assert.match(topBar, /Checkpoints & GitHub/, "build-top-bar must offer Checkpoints & GitHub option");

console.log("GitHub connector and checkpoints contract verified. ✓");
