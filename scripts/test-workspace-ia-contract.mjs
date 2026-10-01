/**
 * test-workspace-ia-contract.mjs
 *
 * Verifies that the Phase 3 Information Architecture constraints are respected:
 *   1. Sidebar has exactly the 4 navigation pillars (no museum of hidden features)
 *   2. No hardcoded plan name / energy strings in the sidebar dropdown
 *   3. Build top-bar status label is derived from resolveSquadStatusLabel (not hardcoded "Running")
 *   4. usePowerStatus hook exists and is imported by the sidebar
 *   5. <details> accordion pattern removed from sidebar
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// ─── 1. Sidebar — 4-pillar navigation ─────────────────────────────────────────
const sidebar = read("components/chat/app-sidebar.tsx");

// Missions pillar: "Nouvelle discussion" CTA navigates to /
assert.match(sidebar, /Nouvelle discussion/, "sidebar must have Nouvelle discussion CTA");

// Connecteurs pillar: direct link to /plugins (no accordion)
assert.match(sidebar, /href="\/plugins"/, "sidebar must have direct /plugins link");
assert.match(sidebar, /Connecteurs/, "sidebar must label the Connecteurs pillar");

// Paramètres pillar: direct link to /settings
assert.match(sidebar, /href="\/settings"/, "sidebar must have direct /settings link");

// Workspaces pillar: SidebarHistory component
assert.match(sidebar, /<SidebarHistory/, "sidebar must render SidebarHistory");

// ─── 2. No hardcoded plan name or energy value ─────────────────────────────────
assert.doesNotMatch(
  sidebar,
  /Plan découverte/,
  "sidebar must not contain hardcoded 'Plan découverte'"
);
assert.doesNotMatch(
  sidebar,
  /82 énergie/,
  "sidebar must not contain hardcoded '82 énergie'"
);

// ─── 3. Dynamic power data via usePowerStatus ──────────────────────────────────
assert.match(
  sidebar,
  /usePowerStatus/,
  "sidebar must import and use usePowerStatus hook"
);
assert.match(
  sidebar,
  /powerStatus\?\.plan/,
  "sidebar must read plan from powerStatus (not hardcoded)"
);
assert.match(
  sidebar,
  /powerStatus\.balance/,
  "sidebar must read balance from powerStatus (not hardcoded)"
);

// ─── 4. No <details> accordion museum ──────────────────────────────────────────
assert.doesNotMatch(
  sidebar,
  /<details/,
  "sidebar must not contain <details> accordion pattern"
);

// ─── 5. PowerStatusBadge preserved (contract from test-power-system-v2.mjs) ───
assert.match(sidebar, /PowerStatusBadge/, "sidebar must keep PowerStatusBadge");

// ─── 6. usePowerStatus hook file exists ───────────────────────────────────────
const hookPath = path.join(ROOT, "hooks/use-power-status.ts");
assert.ok(
  fs.existsSync(hookPath),
  "hooks/use-power-status.ts must exist"
);
const hook = read("hooks/use-power-status.ts");
assert.match(hook, /parsePowerStatus/, "hook must use parsePowerStatus");
assert.match(hook, /\/api\/idealy\/power/, "hook must fetch from /api/idealy/power");

// ─── 7. Build top-bar — no hardcoded "Running" static status ──────────────────
const topbar = read("components/chat/build-top-bar.tsx");

// resolveSquadStatusLabel function must exist
assert.match(
  topbar,
  /resolveSquadStatusLabel/,
  "build-top-bar must have resolveSquadStatusLabel function"
);

// The function must handle all real lifecycle states
assert.match(topbar, /"ready"/, "topbar status fn must handle 'ready' state");
assert.match(topbar, /"building"/, "topbar status fn must handle 'building' state");
assert.match(topbar, /"needs-fix"/, "topbar status fn must handle 'needs-fix' state");
assert.match(topbar, /"auto_correction_started"/, "topbar status fn must handle auto_correction_started");

// No naked hardcoded "Running" string masking real state
assert.doesNotMatch(
  topbar,
  /:\s*"Running"\s*[^;]/,
  "topbar must not have hardcoded static 'Running' status string"
);

// PowerStatusBadge compact preserved (required by test-power-system-v2.mjs)
assert.match(topbar, /<PowerStatusBadge compact \/>/, "topbar must keep PowerStatusBadge compact");

// Squad contracts preserved (required by test-mission-squad-contract.mjs)
assert.match(topbar, /crypto\.randomUUID/, "topbar must use crypto.randomUUID for idempotency");
assert.match(topbar, /missionReplayNonce/, "topbar must increment missionReplayNonce");
assert.match(topbar, /Run squad/, "topbar must have Run squad label");
assert.match(topbar, /\/squad/, "topbar must POST to /squad endpoint");

// aria-live on status pill for screen-reader correctness
assert.match(topbar, /aria-live="polite"/, "topbar squad status pill must have aria-live");

console.log("Workspace IA contract verified. ✓");
