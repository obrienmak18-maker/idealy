import {
  filterConnectorCatalog,
  toPublicConnectorDefinition,
  type ConnectorCategory,
  type ConnectorCapability,
  type ConnectorRuntime,
} from "@/lib/idealy/connectors";

const categories = new Set<ConnectorCategory>([
  "billing",
  "code",
  "communication",
  "data",
  "deploy",
  "design",
]);
const capabilities = new Set<ConnectorCapability>([
  "billing-read",
  "billing-write",
  "database-read",
  "database-write",
  "deployment-preview",
  "deployment-production",
  "design-assets-read",
  "design-assets-write",
  "design-export",
  "design-generation",
  "document-read",
  "document-write",
  "file-storage",
  "issue-management",
  "message-send",
  "repository-read",
  "repository-write",
]);
const runtimes = new Set<ConnectorRuntime>([
  "idealy-server",
  "manus-only",
  "supabase-edge",
]);

function valueInSet<T extends string>(value: string | null, values: Set<T>) {
  return value && values.has(value as T) ? (value as T) : undefined;
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const category = valueInSet(searchParams.get("category"), categories);
  const capability = valueInSet(searchParams.get("capability"), capabilities);
  const runtime = valueInSet(searchParams.get("runtime"), runtimes);
  const connectors = filterConnectorCatalog({ category, capability, runtime });

  return Response.json({
    connectors: connectors.map(toPublicConnectorDefinition),
    source: "idealy-connector-registry",
    version: 1,
  });
}
