/**
 * Phase 8 Contract Test — Voice Lifecycle Hook + Command Palette
 *
 * Validates:
 * 1. useVoice hook exports the correct API surface (state machine, callbacks, detection).
 * 2. CommandPalette component exists with ⌘K binding and action groups.
 * 3. multimodal-input.tsx uses the useVoice hook (no inline SpeechRecognition).
 * 4. shell.tsx mounts the CommandPalette.
 * 5. build-top-bar.tsx wires command palette custom events.
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

// --- 1. useVoice hook ---
const voiceHookPath = "hooks/use-voice.ts";
assert("hooks/use-voice.ts exists", existsSync(voiceHookPath));
const voiceHook = readFileSync(voiceHookPath, "utf-8");
assert("useVoice exports VoiceState type", /export type VoiceState/.test(voiceHook));
assert("useVoice exports UseVoiceReturn", /export interface UseVoiceReturn/.test(voiceHook));
assert("useVoice has idle state", /["']idle["']/.test(voiceHook));
assert("useVoice has requesting state", /["']requesting["']/.test(voiceHook));
assert("useVoice has listening state", /["']listening["']/.test(voiceHook));
assert("useVoice detects SpeechRecognition", /SpeechRecognition/.test(voiceHook));
assert("useVoice detects webkitSpeechRecognition", /webkitSpeechRecognition/.test(voiceHook));
assert("useVoice has onInterim callback", /onInterim/.test(voiceHook));
assert("useVoice has onFinal callback", /onFinal/.test(voiceHook));
assert("useVoice has onError callback", /onError/.test(voiceHook));
assert("useVoice has silence timeout", /silenceTimeoutMs/.test(voiceHook));
assert("useVoice exports start/stop/toggle", /start.*stop.*toggle|toggle.*start.*stop/s.test(voiceHook));
assert("useVoice has VoiceErrorKind type", /export type VoiceErrorKind/.test(voiceHook));
assert("useVoice maps error kinds (NOT_SUPPORTED)", /NOT_SUPPORTED/.test(voiceHook));
assert("useVoice maps error kinds (PERMISSION_DENIED)", /PERMISSION_DENIED/.test(voiceHook));

// --- 2. CommandPalette component ---
const palettePath = "components/chat/command-palette.tsx";
assert("command-palette.tsx exists", existsSync(palettePath));
const palette = readFileSync(palettePath, "utf-8");
assert("CommandPalette exports function", /export function CommandPalette/.test(palette));
assert("⌘K/Ctrl+K listener", /metaKey.*ctrlKey|ctrlKey.*metaKey/.test(palette));
assert("key === 'k' binding", /key\s*===?\s*["']k["']/.test(palette));
assert("Navigation group", /Navigation/.test(palette));
assert("Workspace group", /Workspace/.test(palette));
assert("IA group heading", /heading:\s*["']IA["']/.test(palette));
assert("Apparence group", /Apparence/.test(palette));
assert("Checkpoints action", /Checkpoints/.test(palette));
assert("Inspecteur visuel action", /Inspecteur visuel/.test(palette));
assert("Database Inspector action", /Database Inspector/.test(palette));
assert("Dictée vocale action", /Dictée vocale/.test(palette));
assert("Uses CommandDialog", /CommandDialog/.test(palette));
assert("Uses router.push", /router\.push/.test(palette));
assert("Dispatches idealy:toggle-voice", /idealy:toggle-voice/.test(palette));
assert("Dispatches idealy:open-checkpoint-modal", /idealy:open-checkpoint-modal/.test(palette));
assert("Dispatches idealy:toggle-visual-inspector", /idealy:toggle-visual-inspector/.test(palette));
assert("Dispatches idealy:switch-workspace-view", /idealy:switch-workspace-view/.test(palette));
assert("Listens for idealy:open-command-palette", /idealy:open-command-palette/.test(palette));

// --- 3. multimodal-input.tsx uses useVoice ---
const inputPath = "components/chat/multimodal-input.tsx";
const inputSrc = readFileSync(inputPath, "utf-8");
assert("multimodal-input imports useVoice", /import.*useVoice/.test(inputSrc));
assert("multimodal-input calls useVoice", /useVoice\s*\(/.test(inputSrc));
assert("No inline SpeechRecognition constructor", !/new Recognition\(\)/.test(inputSrc));
assert("No recognitionRef", !/recognitionRef/.test(inputSrc));
assert("Listens for idealy:toggle-voice", /idealy:toggle-voice/.test(inputSrc));
assert("Listens for idealy:set-chat-input", /idealy:set-chat-input/.test(inputSrc));

// --- 4. shell.tsx mounts CommandPalette ---
const shellPath = "components/chat/shell.tsx";
const shellSrc = readFileSync(shellPath, "utf-8");
assert("shell.tsx imports CommandPalette", /import.*CommandPalette/.test(shellSrc));
assert("shell.tsx renders <CommandPalette", /<CommandPalette/.test(shellSrc));

// --- 5. build-top-bar.tsx wires palette events ---
const topBarPath = "components/chat/build-top-bar.tsx";
const topBarSrc = readFileSync(topBarPath, "utf-8");
assert("build-top-bar listens to idealy:open-checkpoint-modal", /idealy:open-checkpoint-modal/.test(topBarSrc));
assert("build-top-bar listens to idealy:toggle-visual-inspector", /idealy:toggle-visual-inspector/.test(topBarSrc));
assert("build-top-bar listens to idealy:switch-workspace-view", /idealy:switch-workspace-view/.test(topBarSrc));

// --- Result ---
const total = passed + failed;
if (failed > 0) {
  console.error(`\nPhase 8 contract: ${failed}/${total} checks FAILED.`);
  process.exit(1);
} else {
  console.log(`Voice lifecycle & command palette contract verified (${total}/${total}). ✓`);
}
