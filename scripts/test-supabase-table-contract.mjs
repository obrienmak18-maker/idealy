import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const migrationsDirectory = join(root, "supabase/migrations");
const migrationNames = await readdir(migrationsDirectory);
const migrations = await Promise.all(
  migrationNames
    .filter((name) => name.endsWith(".sql"))
    .map((name) => readFile(join(migrationsDirectory, name), "utf8"))
);
const migrationSql = migrations.join("\n");

for (const table of ["missions", "mission_agent_runs", "mission_files", "mission_file_events"]) {
  const tablePattern = new RegExp(`CREATE TABLE(?: IF NOT EXISTS)? public\\.${table}\\b`, "i");
  if (!tablePattern.test(migrationSql)) {
    throw new Error(`Missing versioned Supabase table: ${table}`);
  }
}

const filesToCheck = [
  "lib/idealy/backend-adapter.ts",
  "app/(chat)/api/chat/route.ts",
  "supabase/functions/orchestrate-mission/index.ts",
];
const source = (await Promise.all(filesToCheck.map((file) => readFile(join(root, file), "utf8")))).join("\n");

for (const forbiddenReference of [/['"]agent_runs['"]/, /['"]projects['"]/, /project_id\s*:/]) {
  if (forbiddenReference.test(source)) {
    throw new Error(`Found unversioned Supabase table or column reference: ${forbiddenReference}`);
  }
}

if (!source.includes('"mission_agent_runs"')) {
  throw new Error("Mission runs must use the canonical mission_agent_runs table.");
}

console.log("Supabase table contract passed.");
