import { connectorCatalog } from "../connectors";
import { parsePluginManifest } from "./manifest";
import type { ValidPluginManifest } from "./types";

/**
 * Maps each existing connector onto the plugin contract.
 *
 * This is deliberately derived from the connector catalog rather than declared
 * twice: a plugin wraps a connector, it does not replace it. Where the provider
 * credentials are not configured server-side, the plugin is published as
 * `CONFIGURATION_REQUIRED` by `toPublicPlugin` instead of pretending to be
 * connected.
 */

const permissionForCapability: Record<
  string,
  ValidPluginManifest["tools"][number]["permissions"][number]
> = {
  "billing-read": "project.read",
  "database-read": "project.read",
  "database-write": "project.write",
  "deployment-preview": "deployment.execute",
  "deployment-production": "deployment.execute",
  "design-assets-read": "files.read",
  "design-assets-write": "files.write",
  "design-export": "files.read",
  "design-generation": "asset.generate",
  "document-read": "project.read",
  "document-write": "project.write",
  "file-storage": "files.write",
  "issue-management": "repository.write",
  "message-send": "network.access",
  "repository-read": "repository.read",
  "repository-write": "repository.write",
};

/** Connectors that only read data never need `tool.execute` beyond the read. */
const TOOL_PERMISSION: ValidPluginManifest["tools"][number]["permissions"][number] =
  "tool.execute";

const TOOL_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}$/;

function toToolId(connectorId: string, operationId: string): string {
  const candidate = `${connectorId}-${operationId}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return TOOL_ID_PATTERN.test(candidate) ? candidate : "tool";
}

function buildManifest(connector: (typeof connectorCatalog)[number]) {
  const tools = connector.operations.map((operation) => ({
    description: operation.label,
    id: toToolId(connector.id, operation.id),
    label: operation.label,
    permissions: [
      TOOL_PERMISSION,
      ...(permissionForCapability[operation.capability]
        ? [permissionForCapability[operation.capability]]
        : []),
    ],
    requiresConfirmation: operation.requiresConfirmation,
    risk: operation.risk,
  }));

  // Deduplicate: two operations may map onto the same permission pair.
  const seen = new Set<string>();
  const uniqueTools = tools.filter((tool) => {
    if (seen.has(tool.id)) {
      return false;
    }
    seen.add(tool.id);
    return true;
  });

  const requestedPermissions = [
    ...new Set(uniqueTools.flatMap((tool) => [...tool.permissions])),
  ];

  const result = parsePluginManifest({
    agents: [],
    author: "Idealy",
    category: connector.category,
    dependencies: [],
    description: connector.description,
    id: connector.id,
    minimumPlan: "free",
    name: connector.label,
    requestedPermissions,
    requirements: {
      ...(connector.auth === "oauth2"
        ? { connectorProvider: connector.provider }
        : {}),
      requiredScopes: connector.scopes,
      requiredSecretEnvNames: connector.secretEnvNames,
    },
    skills: [],
    tools: uniqueTools,
    transport: connector.runtime === "supabase-edge" ? "http" : "native",
    version: "1.0.0",
  });

  if (!result.ok) {
    // A malformed derived manifest is a programming error, not a runtime state.
    throw new Error(
      `Connector "${connector.id}" produced an invalid plugin manifest: ${result.errors.join("; ")}`
    );
  }
  return result.manifest;
}

export const PLUGIN_MANIFESTS: readonly ValidPluginManifest[] =
  connectorCatalog.map(buildManifest);

export function findPluginManifest(
  pluginId: string
): ValidPluginManifest | undefined {
  return PLUGIN_MANIFESTS.find((manifest) => manifest.id === pluginId);
}
