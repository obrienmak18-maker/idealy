import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const runtimeCode = await readFile(
  new URL("../lib/idealy/runtime/e2b.ts", import.meta.url),
  "utf8"
);
const toolCode = await readFile(
  new URL("../lib/ai/tools/execute-sandbox.ts", import.meta.url),
  "utf8"
);
const routeCode = await readFile(
  new URL("../app/(chat)/api/chat/route.ts", import.meta.url),
  "utf8"
);
const promptsCode = await readFile(
  new URL("../lib/ai/prompts.ts", import.meta.url),
  "utf8"
);

// 1. Boundary & Safety
assert.match(
  runtimeCode,
  /import "server-only"/,
  "E2B runtime must remain strictly server-only."
);
assert.match(
  runtimeCode,
  /sbx\.kill\(\)/,
  "E2B runtime must unconditionally terminate ephemeral sandboxes to prevent compute leaks."
);
assert.match(
  runtimeCode,
  /finally[\s\S]*?kill\(\)/,
  "E2B runtime must kill sandboxes inside a finally block."
);
assert.match(
  runtimeCode,
  /Math\.min\([\s\S]*?60_000\)/,
  "E2B execution timeout must be bounded by a strict hard ceiling."
);

// 2. Tool & Routing
assert.match(
  toolCode,
  /executeSandbox/,
  "executeSandbox AI tool must be defined."
);
assert.match(
  routeCode,
  /import \{ executeSandbox \} from "@\/lib\/ai\/tools\/execute-sandbox"/,
  "Chat route must import executeSandbox."
);
assert.match(
  routeCode,
  /"executeSandbox"/,
  "Chat route must include executeSandbox in activeTools."
);
assert.match(
  routeCode,
  /executeSandbox: executeSandbox\(\)/,
  "Chat route must register executeSandbox in tools mapping."
);

// 3. System Prompt Documentation
assert.match(
  promptsCode,
  /executeSandbox/,
  "artifactsPrompt must document executeSandbox for AI models."
);

console.log("Idealy E2B sandbox runtime contract passed.");
