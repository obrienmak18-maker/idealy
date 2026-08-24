import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const supabaseRoot = join(root, "supabase");
const integrationRoot = join(root, "integrations", "idealy");
const coreRoot = join(integrationRoot, "backend-core", "src");

const requiredFiles = [
  "supabase/config.toml",
  "supabase/schema.sql",
  "supabase/migrations/20260807000000_missions.sql",
  "supabase/migrations/20260813000000_mission_contracts.sql",
  "supabase/migrations/20260824000000_mission_files.sql",
  "supabase/functions/process-ai-request/index.ts",
  "supabase/functions/process-ai-request/aiProvider.ts",
  "supabase/functions/stripe-webhook/index.ts",
  "supabase/functions/github-export/index.ts",
  "supabase/functions/vercel-deploy/index.ts",
  "integrations/idealy/api-server/src/index.ts",
  "integrations/idealy/api-spec/openapi.yaml",
  "integrations/idealy/api-zod/src/index.ts",
  "integrations/idealy/db/src/index.ts",
  "integrations/idealy/backend-core/src/core/mission",
  "integrations/idealy/backend-core/src/core/webcontainer",
  "integrations/idealy/backend-core/src/agents/orchestrator.ts",
];

const requiredFunctions = [
  "ai-proxy",
  "cancel-subscription",
  "check-subscription",
  "create-billing-portal",
  "create-checkout-session",
  "designer-tools",
  "github-export",
  "integration-callback",
  "integration-connect",
  "integration-status",
  "process-ai-request",
  "refund-ai-credit",
  "stripe-webhook",
  "vercel-deploy",
  "vercel-status",
];

const missing = requiredFiles.filter((entry) => !existsSync(join(root, entry)));
const functionNames = readdirSync(join(supabaseRoot, "functions"), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory() && entry.name !== "_shared")
  .map((entry) => entry.name)
  .sort();
const missingFunctions = requiredFunctions.filter(
  (name) => !functionNames.includes(name)
);

const processAI = readFileSync(
  join(supabaseRoot, "functions", "process-ai-request", "index.ts"),
  "utf8"
);
const requiredSecurityMarkers = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "getUser",
  "intentOnly",
  "planOnly",
  "idempotencyKey",
  "consumeManagedCredit",
  "workspaceStream",
  "mission_files",
  "append_mission_file_event",
];
const missingSecurityMarkers = requiredSecurityMarkers.filter(
  (marker) => !processAI.includes(marker)
);

const forbiddenFrontendPaths = [
  "src/app",
  "src/components",
  "src/routes",
  "src/themes",
].filter((entry) => existsSync(join(root, entry)));

if (missing.length || missingFunctions.length || missingSecurityMarkers.length) {
  console.error(
    JSON.stringify(
      {
        missing,
        missingFunctions,
        missingSecurityMarkers,
      },
      null,
      2
    )
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      backendRoot: relative(root, supabaseRoot),
      edgeFunctions: functionNames,
      frontendHistoricalPathsPresent: forbiddenFrontendPaths,
      idealyContractsRoot: relative(root, coreRoot),
      status: "ok",
    },
    null,
    2
  )
);
