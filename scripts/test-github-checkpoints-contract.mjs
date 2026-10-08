/**
 * test-github-checkpoints-contract.mjs
 *
 * Verifies Phase 7 constraints:
 *   1. lib/idealy/checkpoints.ts exports syncMissionToGitHub and CheckpointSnapshot
 *   2. syncMissionToGitHub uses genuine GitHub REST API endpoints with Base64 encoding and branch resolution
 *   3. /api/idealy/missions/[missionId]/checkpoints route authenticates and handles snapshot persistence
 *   4. /api/idealy/missions/[missionId]/rollback route authenticates and processes rollback requests
 *   5. /api/idealy/missions/[missionId]/github route authenticates, delegates to the user-scoped Edge sync, and requires confirmation
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

assert.match(githubRoute, /getToken\(/, "github sync route must authenticate the NextAuth session");
assert.match(githubRoute, /confirmationToken/, "github sync route must require a one-shot confirmation token");
assert.match(githubRoute, /functions\/v1\/github-sync/, "github sync route must delegate to the user-scoped Edge function");


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

const githubExport = read("supabase/functions/github-export/index.ts");
assert.match(githubExport, /idealy\/mission-/, "exports must use a dedicated Idealy branch");
assert.match(githubExport, /never publish/i, "export function must document the default-branch safety rule");

const githubSync = read("supabase/functions/github-sync/index.ts");
assert.match(githubSync, /confirmation_token_hash/, "GitHub sync must consume a one-shot confirmation");
assert.match(githubSync, /requestedBranch === "main"/, "GitHub sync must reject main");
assert.match(githubSync, /requestedBranch === "master"/, "GitHub sync must reject master");

console.log("GitHub connector and checkpoints contract verified. ✓");
