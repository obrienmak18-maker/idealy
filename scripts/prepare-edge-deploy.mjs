import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const argumentsList = process.argv.slice(2);
const noJwt = argumentsList.includes("--no-jwt");
const [functionName, ...relativeFiles] = argumentsList.filter((argument) => argument !== "--no-jwt");
if (!functionName || relativeFiles.length === 0) {
  throw new Error("Usage: node scripts/prepare-edge-deploy.mjs <function-name> <relative-file> [...]");
}

const functionDirectory = resolve("supabase/functions", functionName);
const files = await Promise.all(
  relativeFiles.map(async (relativeFile) => ({
    content: await readFile(resolve(functionDirectory, relativeFile), "utf8"),
    name: basename(relativeFile),
  })),
);
const importMapPath = relativeFiles.includes("deno.json") ? "deno.json" : undefined;

await writeFile(
  `.deploy-${functionName}.json`,
  JSON.stringify({
    entrypoint_path: "index.ts",
    files,
    ...(importMapPath ? { import_map_path: importMapPath } : {}),
    name: functionName,
    project_id: "vhucjkyktdflwocrmzhe",
    verify_jwt: !noJwt,
  }),
);
