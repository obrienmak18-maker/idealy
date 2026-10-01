/**
 * Phase 9 Contract Test — Accessibility, Performance & Spatial Polish
 *
 * Validates:
 * 1. OKLCH semantic state tokens (--idealy-success, --idealy-warning, --idealy-error, --idealy-activity) in globals.css.
 * 2. Accessible focus-visible rings on Button, MessageActions, SidebarHistoryItem, SuggestedActions.
 * 3. Global prefers-reduced-motion rule in globals.css.
 * 4. Skip-to-main-content accessible link in app/(chat)/layout.tsx targeting #main-content.
 * 5. Semantic <main id="main-content"> landmark in components/chat/shell.tsx.
 * 6. Code splitting / lazy loading via next/dynamic for heavy editors (CodeEditor, SpreadsheetEditor, DatabaseInspector).
 */

import { readFileSync, existsSync } from "fs";

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ ${label}`);
  }
}

// --- 1. OKLCH Tokens & Universal Reduced Motion in globals.css ---
const globalsCssPath = "app/globals.css";
assert("app/globals.css exists", existsSync(globalsCssPath));
const globalsCss = readFileSync(globalsCssPath, "utf-8");

assert("globals.css has --idealy-success in OKLCH", /--idealy-success:\s*oklch\(/i.test(globalsCss));
assert("globals.css has --idealy-warning in OKLCH", /--idealy-warning:\s*oklch\(/i.test(globalsCss));
assert("globals.css has --idealy-error in OKLCH", /--idealy-error:\s*oklch\(/i.test(globalsCss));
assert("globals.css has --idealy-activity in OKLCH", /--idealy-activity:\s*oklch\(/i.test(globalsCss));
assert("globals.css defines --color-idealy-success in @theme inline", /--color-idealy-success:\s*var\(--idealy-success\)/.test(globalsCss));
assert("globals.css defines focus-visible outline with var(--ring)", /outline:\s*2px\s+solid\s+var\(--ring\)/.test(globalsCss));
assert("globals.css has universal prefers-reduced-motion rule", /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*(\*|::before)/.test(globalsCss));

// --- 2. Button Focus Rings in components/ui/button.tsx ---
const buttonPath = "components/ui/button.tsx";
assert("button.tsx exists", existsSync(buttonPath));
const buttonSrc = readFileSync(buttonPath, "utf-8");
assert("Button has focus-visible:ring-2", /focus-visible:ring-2/.test(buttonSrc));
assert("Button has focus-visible:ring-ring", /focus-visible:ring-ring/.test(buttonSrc));
assert("Button has focus-visible:outline-none", /focus-visible:outline-none/.test(buttonSrc));

// --- 3. Message Actions Focus Visibility in components/chat/message-actions.tsx ---
const messageActionsPath = "components/chat/message-actions.tsx";
assert("message-actions.tsx exists", existsSync(messageActionsPath));
const messageActionsSrc = readFileSync(messageActionsPath, "utf-8");
assert("Message actions have group-focus-within/message:opacity-100", /group-focus-within\/message:opacity-100/.test(messageActionsSrc));
assert("Message actions have focus-within:opacity-100", /focus-within:opacity-100/.test(messageActionsSrc));

// --- 4. Sidebar History Item Focus in components/chat/sidebar-history-item.tsx ---
const historyItemPath = "components/chat/sidebar-history-item.tsx";
assert("sidebar-history-item.tsx exists", existsSync(historyItemPath));
const historyItemSrc = readFileSync(historyItemPath, "utf-8");
assert("Sidebar history item does NOT suppress focus ring with focus-visible:ring-0", !/focus-visible:ring-0/.test(historyItemSrc));
assert("Sidebar history item has focus-visible:ring-2", /focus-visible:ring-2/.test(historyItemSrc));
assert("Sidebar history item has focus-visible:ring-sidebar-ring", /focus-visible:ring-sidebar-ring/.test(historyItemSrc));

// --- 5. Suggested Actions Focus in components/chat/suggested-actions.tsx ---
const suggestedActionsPath = "components/chat/suggested-actions.tsx";
assert("suggested-actions.tsx exists", existsSync(suggestedActionsPath));
const suggestedActionsSrc = readFileSync(suggestedActionsPath, "utf-8");
assert("Suggested actions have focus-visible:ring-2", /focus-visible:ring-2/.test(suggestedActionsSrc));
assert("Suggested actions have focus-visible:ring-ring", /focus-visible:ring-ring/.test(suggestedActionsSrc));

// --- 6. Skip Link in app/(chat)/layout.tsx ---
const chatLayoutPath = "app/(chat)/layout.tsx";
assert("app/(chat)/layout.tsx exists", existsSync(chatLayoutPath));
const chatLayoutSrc = readFileSync(chatLayoutPath, "utf-8");
assert("Chat layout has skip link href='#main-content'", /href=["']#main-content["']/.test(chatLayoutSrc));
assert("Skip link has sr-only focus:not-sr-only classes", /sr-only\s+focus:not-sr-only/.test(chatLayoutSrc));

// --- 7. Semantic <main id="main-content"> Landmark in components/chat/shell.tsx ---
const shellPath = "components/chat/shell.tsx";
assert("components/chat/shell.tsx exists", existsSync(shellPath));
const shellSrc = readFileSync(shellPath, "utf-8");
assert("Shell has <main element", /<main[\s\S]*?id=["']main-content["']/.test(shellSrc));
assert("Shell has closing </main>", /<\/main>/.test(shellSrc));

// --- 8. Code Splitting & Dynamic Imports ---
const codeClientPath = "artifacts/code/client.tsx";
assert("artifacts/code/client.tsx exists", existsSync(codeClientPath));
const codeClientSrc = readFileSync(codeClientPath, "utf-8");
assert("code client imports dynamic from next/dynamic", /import\s+dynamic\s+from\s+["']next\/dynamic["']/.test(codeClientSrc));
assert("code client lazily loads CodeEditor", /const\s+CodeEditor\s*=\s*dynamic\(/.test(codeClientSrc));

const sheetClientPath = "artifacts/sheet/client.tsx";
assert("artifacts/sheet/client.tsx exists", existsSync(sheetClientPath));
const sheetClientSrc = readFileSync(sheetClientPath, "utf-8");
assert("sheet client imports dynamic from next/dynamic", /import\s+dynamic\s+from\s+["']next\/dynamic["']/.test(sheetClientSrc));
assert("sheet client lazily loads SpreadsheetEditor", /const\s+SpreadsheetEditor\s*=\s*dynamic\(/.test(sheetClientSrc));

const artifactPath = "components/chat/artifact.tsx";
assert("components/chat/artifact.tsx exists", existsSync(artifactPath));
const artifactSrc = readFileSync(artifactPath, "utf-8");
assert("artifact.tsx imports dynamic from next/dynamic", /import\s+dynamic\s+from\s+["']next\/dynamic["']/.test(artifactSrc));
assert("artifact.tsx lazily loads DatabaseInspector", /const\s+DatabaseInspector\s*=\s*dynamic\(/.test(artifactSrc));

// --- Result ---
const total = passed + failed;
if (failed > 0) {
  console.error(`\nPhase 9 contract: ${failed}/${total} checks FAILED.`);
  process.exit(1);
} else {
  console.log(`Accessibility, performance and spatial polish contract verified (${total}/${total}). ✓`);
}
