/**
 * test-database-and-visual-inspector-contract.mjs
 *
 * Verifies Phase 6 constraints:
 *   1. DatabaseInspector component exists with real table definitions (missions, mission_files, mission_agent_runs, mission_file_events)
 *   2. DatabaseInspector has schema viewer, search filtering, copy, and export
 *   3. VisualInspector exists with iframe tracking script and floating inspector bar
 *   4. build-top-bar includes Crosshair toggle and idealy:toggle-inspector dispatch
 *   5. artifact.tsx integrates DatabaseInspector and VisualInspectorBar
 *   6. /api/idealy/missions/[missionId]/files/route.ts endpoint exists and protects with auth
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// ─── 1. DatabaseInspector ───────────────────────────────────────────────────
const dbInspector = read("components/chat/database-inspector.tsx");

for (const table of ["missions", "mission_files", "mission_agent_runs", "mission_file_events"]) {
  assert.match(
    dbInspector,
    new RegExp(`name:\\s*"${table}"`),
    `DatabaseInspector must define schema for table '${table}'`
  );
}

assert.match(dbInspector, /activeTab === "schema"/, "DatabaseInspector must provide a schema viewer tab");
assert.match(dbInspector, /setSearchQuery/, "DatabaseInspector must provide live search filtering");
assert.match(dbInspector, /exportTableJson/, "DatabaseInspector must provide JSON export capability");
assert.doesNotMatch(dbInspector, /rows:\s*"—"/, "DatabaseInspector must not use hardcoded '—' placeholders");

// ─── 2. VisualInspector ─────────────────────────────────────────────────────
const visualInspector = read("components/chat/visual-inspector.tsx");

assert.match(visualInspector, /VISUAL_INSPECTOR_IFRAME_SCRIPT/, "visual-inspector must export iframe injection script");
assert.match(visualInspector, /VisualInspectorBar/, "visual-inspector must export VisualInspectorBar component");
assert.match(visualInspector, /idealy:element-inspected/, "visual-inspector must handle element inspection events");
assert.match(visualInspector, /idealy:set-chat-input/, "visual-inspector must dispatch prompt pre-fills to chat input");

// ─── 3. BuildTopBar Inspector Toggle ────────────────────────────────────────
const topBar = read("components/chat/build-top-bar.tsx");

assert.match(topBar, /Crosshair/, "build-top-bar must import and use Crosshair icon");
assert.match(topBar, /idealy:toggle-inspector/, "build-top-bar must dispatch idealy:toggle-inspector event");

// ─── 4. Artifact Integration ────────────────────────────────────────────────
const artifact = read("components/chat/artifact.tsx");

assert.match(artifact, /<DatabaseInspector/, "artifact.tsx must render DatabaseInspector");
assert.match(artifact, /<VisualInspectorBar/, "artifact.tsx must render VisualInspectorBar");
assert.match(artifact, /VISUAL_INSPECTOR_IFRAME_SCRIPT/, "artifact.tsx must inject VISUAL_INSPECTOR_IFRAME_SCRIPT into preview HTML");
assert.match(artifact, /ref=\{previewIframeRef\}/, "artifact.tsx must attach previewIframeRef to preview iframe");

// ─── 5. Mission Files API Endpoint ──────────────────────────────────────────
const filesRoute = read("app/api/idealy/missions/[missionId]/files/route.ts");

assert.match(filesRoute, /auth\(\)/, "files route must authenticate user session");
assert.match(filesRoute, /listIdealyMissionFiles/, "files route must query mission files");
assert.match(filesRoute, /listIdealyMissionFileEvents/, "files route must query mission file events");

console.log("Database and visual inspector contract verified. ✓");
