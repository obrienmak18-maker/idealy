import { readFile } from "node:fs/promises";

const files = await Promise.all(
  [
    "supabase/functions/designer-tools/index.ts",
    "supabase/functions/vercel-deploy/index.ts",
    "supabase/functions/vercel-status/index.ts",
  ].map(async (path) => [path, await readFile(path, "utf8")]),
);

for (const [path, source] of files) {
  if (path.includes("vercel") && !source.includes("user-scoped OAuth integration")) {
    throw new Error(`${path} must explain its user-scoped OAuth guard`);
  }
  if (path.includes("designer-tools") && !source.includes("mission ownership, rate limits, managed Power, idempotency")) {
    throw new Error(`${path} must explain its metering guard`);
  }
  for (const forbidden of ["VERCEL_TOKEN", "api.vercel.com", "PEXELS_API_KEY", "OPENAI_API_KEY", "fetch("]) {
    if (source.includes(forbidden)) {
      throw new Error(`${path} still permits a shared Vercel server connector`);
    }
  }
}

console.log("Shared external connector guard passed.");
