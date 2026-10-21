/**
 * Verifies the workspace controls stay connected to real application state.
 * Run with: node scripts/test-canvas-workspace-controls.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(ROOT, relativePath), "utf8");

const toolbar = read("components/chat/build-top-bar.tsx");
const artifact = read("components/chat/artifact.tsx");
const databaseInspector = read("components/chat/database-inspector.tsx");
const databaseRoute = read("app/api/idealy/missions/[missionId]/database/route.ts");
const backendAdapter = read("lib/idealy/backend-adapter.ts");

// The active route must be visible and selectable without opening the overflow menu.
assert.match(toolbar, /aria-label="Page affichée dans l’aperçu"/);
assert.match(toolbar, /dynamicPages\.map\(\(previewPage\)/);
assert.match(toolbar, /selectPage\(nextPage\)/);
assert.match(toolbar, /activePreviewPage\.path/);

// Opening another tab must happen in the direct click stack (no delayed custom event).
assert.match(toolbar, /window\.dispatchEvent\(new Event\("idealy:open-preview"\)\)/);
assert.doesNotMatch(toolbar, /dispatch\("idealy:open-preview"\)/);
assert.match(artifact, /window\.open\("about:blank", "_blank"\)/);
assert.match(artifact, /previewHtmlForFrameRef\.current/);
assert.match(artifact, /Le navigateur a bloqué l’ouverture du nouvel onglet/);

// Code/data tables use the actual authorized API response; no synthetic agent/event rows.
assert.match(databaseInspector, /\/api\/idealy\/missions\/\$\{encodeURIComponent\(missionId\)\}\/database/);
assert.doesNotMatch(databaseInspector, /run-dispatch|run-blueprint|run-builder|run-qa/);
assert.doesNotMatch(databaseInspector, /PostgreSQL RLS Actif/);
assert.match(databaseInspector, /Aucune donnée simulée n’est affichée/);
assert.match(databaseRoute, /await auth\(\)/);
assert.match(databaseRoute, /getIdealyMissionDatabaseRecord/);
assert.match(databaseRoute, /listIdealyMissionAgentRuns/);
assert.match(databaseRoute, /listIdealyMissionFileEvents/);
assert.match(backendAdapter, /missions\?select=id,title,status,way,dna,validation,created_at/);
assert.match(backendAdapter, /mission_agent_runs\?select=id,mission_id,run_key,step_index,agent_key,status,started_at,completed_at/);

console.log("Canvas workspace controls contract verified. ✓");
