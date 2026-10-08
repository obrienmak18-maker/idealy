import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  filterConnectorCatalog,
  getConnectorDefinition,
  listConnectorDefinitions,
  toPublicConnectorDefinition,
} from "../lib/idealy/connectors";

async function main() {
  const definitions = listConnectorDefinitions();
  assert(definitions.length >= 8);

  const [
    oauthStartRoute,
    vercelStartRoute,
    integrationConnect,
    integrationCallback,
    vercelConnect,
    vercelCallback,
  ] = await Promise.all([
    readFile("app/(chat)/api/idealy/connectors/start/route.ts", "utf8"),
    readFile("app/api/idealy/connectors/vercel/start/route.ts", "utf8"),
    readFile("supabase/functions/integration-connect/index.ts", "utf8"),
    readFile("supabase/functions/integration-callback/index.ts", "utf8"),
    readFile("supabase/functions/vercel-connect/index.ts", "utf8"),
    readFile("supabase/functions/vercel-callback/index.ts", "utf8"),
  ]);

  for (const provider of [
    "github",
    "canva",
    "figma",
    "google-drive",
    "notion",
    "slack",
  ]) {
    const callbackProvider = provider === "google-drive" ? "google" : provider;
    assert.match(oauthStartRoute, new RegExp(`"${provider}"`));
    assert.match(integrationConnect, new RegExp(`case "${provider}"`));
    assert.match(integrationCallback, new RegExp(`case "${callbackProvider}"`));
  }

  assert.match(vercelStartRoute, /vercel-connect/);
  assert.match(vercelConnect, /https:\/\/vercel\.com\/oauth\/authorize/);
  assert.match(
    vercelCallback,
    /https:\/\/api\.vercel\.com\/login\/oauth\/token/,
  );
  assert.match(vercelCallback, /api\.vercel\.com\/login\/oauth\/userinfo/);

  const canva = getConnectorDefinition("canva");
  assert(canva);
  assert.equal(canva.availability, "planned");
  assert.equal(canva.runtime, "idealy-server");
  assert(canva.secretEnvNames.includes("CANVA_CLIENT_SECRET"));
  assert(canva.operations.some((operation) => operation.id === "list-designs"));
  assert(
    canva.operations
      .filter((operation) => operation.risk !== "read")
      .every((operation) => operation.requiresConfirmation),
  );

  const publicCanva = toPublicConnectorDefinition(canva);
  assert(!("secretEnvNames" in publicCanva));
  assert.equal(publicCanva.requiresServerConfiguration, true);

  const supabase = getConnectorDefinition("supabase");
  assert(supabase);
  assert.equal(supabase.availability, "configured");
  assert.equal(supabase.runtime, "supabase-edge");
  assert.equal(supabase.secretEnvNames.length, 0);
  assert.equal(
    toPublicConnectorDefinition(supabase).requiresServerConfiguration,
    false,
  );

  const designConnectors = filterConnectorCatalog({ category: "design" });
  assert(designConnectors.some((connector) => connector.id === "canva"));
  assert(designConnectors.some((connector) => connector.id === "figma"));

  const publishConnectors = filterConnectorCatalog({
    capability: "deployment-production",
  });
  assert(publishConnectors.some((connector) => connector.id === "vercel"));

  console.log(`Connector registry checks passed: ${definitions.length} definitions.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
