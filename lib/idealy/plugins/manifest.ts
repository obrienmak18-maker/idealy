import {
  isPluginPermission,
  type PluginAgent,
  type PluginPermission,
  type PluginSkill,
  type PluginTool,
  type PluginTransport,
  type ValidPluginManifest,
} from "./types";

const PLUGIN_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;
const MAX_TOOLS = 40;

const PLANS = ["free", "pro", "business"] as const;
const TRANSPORTS: readonly PluginTransport[] = ["native", "mcp", "http"];
const RISKS = ["read", "write", "publish", "financial"] as const;

export type ManifestValidationResult =
  | { ok: true; manifest: ValidPluginManifest }
  | { ok: false; errors: readonly string[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

const isPermissionArray = (value: unknown): value is PluginPermission[] =>
  Array.isArray(value) && value.every(isPluginPermission);

/**
 * A tool that declares no permission would silently bypass the server-side
 * permission gate, so it is rejected rather than defaulted.
 */
function parseTool(
  value: unknown,
  errors: string[],
  path: string
): PluginTool | null {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  const { description, id, label, permissions, requiresConfirmation, risk } =
    value;
  if (typeof id !== "string" || !PLUGIN_ID_PATTERN.test(id)) {
    errors.push(`${path}.id must match ${PLUGIN_ID_PATTERN}`);
    return null;
  }
  if (typeof label !== "string" || label.trim().length === 0) {
    errors.push(`${path}.label must be a non-empty string`);
  }
  if (typeof description !== "string" || description.trim().length === 0) {
    errors.push(`${path}.description must be a non-empty string`);
  }
  if (!isPermissionArray(permissions)) {
    errors.push(`${path}.permissions must be a subset of PLUGIN_PERMISSIONS`);
  } else if (permissions.length === 0) {
    errors.push(`${path}.permissions must declare at least one permission`);
  }
  if (
    typeof risk !== "string" ||
    !(RISKS as readonly string[]).includes(risk)
  ) {
    errors.push(`${path}.risk must be one of ${RISKS.join(", ")}`);
  }
  if (typeof requiresConfirmation !== "boolean") {
    errors.push(`${path}.requiresConfirmation must be a boolean`);
  }
  return value as unknown as PluginTool;
}

function parseSkill(
  value: unknown,
  errors: string[],
  path: string
): PluginSkill | null {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  if (typeof value.id !== "string" || !PLUGIN_ID_PATTERN.test(value.id)) {
    errors.push(`${path}.id must match ${PLUGIN_ID_PATTERN}`);
  }
  if (typeof value.label !== "string" || value.label.trim().length === 0) {
    errors.push(`${path}.label must be a non-empty string`);
  }
  return value as unknown as PluginSkill;
}

function parseAgent(
  value: unknown,
  errors: string[],
  path: string
): PluginAgent | null {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  if (typeof value.id !== "string" || !PLUGIN_ID_PATTERN.test(value.id)) {
    errors.push(`${path}.id must match ${PLUGIN_ID_PATTERN}`);
  }
  if (typeof value.label !== "string" || value.label.trim().length === 0) {
    errors.push(`${path}.label must be a non-empty string`);
  }
  return value as unknown as PluginAgent;
}

function parseNamedList<T>(
  value: unknown,
  errors: string[],
  path: string,
  parseItem: (item: unknown, errors: string[], path: string) => T | null
): T[] {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return [];
  }
  const parsed = value
    .map((item, index) => parseItem(item, errors, `${path}[${index}]`))
    .filter((item): item is T => item !== null);
  const seen = new Set<string>();
  for (const item of parsed) {
    const { id } = item as { id: string };
    if (seen.has(id)) {
      errors.push(`${path} contains a duplicate id: ${id}`);
    }
    seen.add(id);
  }
  return parsed;
}

/**
 * Validates a raw plugin manifest. Nothing enters the registry without passing
 * through here, so a malformed manifest can never reach the permission gate.
 */
export function parsePluginManifest(input: unknown): ManifestValidationResult {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { errors: ["manifest must be an object"], ok: false };
  }

  const {
    agents,
    author,
    category,
    dependencies,
    description,
    homepage,
    id,
    minimumPlan,
    name,
    requestedPermissions,
    requirements,
    skills,
    tools,
    transport,
    version,
  } = input;

  if (typeof id !== "string" || !PLUGIN_ID_PATTERN.test(id)) {
    errors.push(`id must match ${PLUGIN_ID_PATTERN}`);
  }
  for (const [field, value] of [
    ["name", name],
    ["author", author],
    ["description", description],
    ["category", category],
  ] as const) {
    if (typeof value !== "string" || value.trim().length === 0) {
      errors.push(`${field} must be a non-empty string`);
    }
  }
  if (typeof version !== "string" || !SEMVER_PATTERN.test(version)) {
    errors.push("version must be a semantic version such as 1.0.0");
  }
  if (typeof homepage !== "undefined" && typeof homepage !== "string") {
    errors.push("homepage must be a string when provided");
  }
  if (isStringArray(dependencies)) {
    if (dependencies.includes(id as string)) {
      errors.push("dependencies must not contain the plugin itself");
    }
    for (const dependency of dependencies) {
      if (!PLUGIN_ID_PATTERN.test(dependency)) {
        errors.push(`dependency id is invalid: ${dependency}`);
      }
    }
  } else {
    errors.push("dependencies must be an array of plugin ids");
  }
  if (!isPermissionArray(requestedPermissions)) {
    errors.push("requestedPermissions must be a subset of PLUGIN_PERMISSIONS");
  }
  if (
    typeof minimumPlan !== "string" ||
    !(PLANS as readonly string[]).includes(minimumPlan)
  ) {
    errors.push(`minimumPlan must be one of ${PLANS.join(", ")}`);
  }
  if (
    typeof transport !== "string" ||
    !(TRANSPORTS as readonly string[]).includes(transport)
  ) {
    errors.push(`transport must be one of ${TRANSPORTS.join(", ")}`);
  }

  if (isRecord(requirements)) {
    if (
      typeof requirements.connectorProvider !== "undefined" &&
      typeof requirements.connectorProvider !== "string"
    ) {
      errors.push("requirements.connectorProvider must be a string");
    }
    if (!isStringArray(requirements.requiredSecretEnvNames)) {
      errors.push("requirements.requiredSecretEnvNames must be an array");
    }
    if (!isStringArray(requirements.requiredScopes)) {
      errors.push("requirements.requiredScopes must be an array");
    }
  } else {
    errors.push("requirements must be an object");
  }

  const rawTools = Array.isArray(tools) ? tools : [];
  if (rawTools.length > MAX_TOOLS) {
    errors.push(`tools must contain at most ${MAX_TOOLS} entries`);
  }
  const parsedTools = parseNamedList(tools, errors, "tools", parseTool);

  if (errors.length > 0) {
    return { errors, ok: false };
  }

  const manifest: ValidPluginManifest = {
    __validated: true,
    agents: parseNamedList(agents, errors, "agents", parseAgent),
    author: author as string,
    category: category as string,
    dependencies: dependencies as string[],
    description: description as string,
    id: id as string,
    minimumPlan: minimumPlan as ValidPluginManifest["minimumPlan"],
    name: name as string,
    requestedPermissions:
      requestedPermissions as ValidPluginManifest["requestedPermissions"],
    requirements: requirements as ValidPluginManifest["requirements"],
    skills: parseNamedList(skills, errors, "skills", parseSkill),
    tools: parsedTools,
    transport: transport as PluginTransport,
    version: version as string,
    ...(typeof homepage === "string" ? { homepage } : {}),
  };

  if (errors.length > 0) {
    return { errors, ok: false };
  }

  // A manifest may not request less than its tools need, otherwise installing
  // it would grant a tool a permission the user never actually approved.
  const requested = new Set(manifest.requestedPermissions);
  for (const tool of manifest.tools) {
    for (const permission of tool.permissions) {
      if (!requested.has(permission)) {
        return {
          errors: [
            `tool ${tool.id} requires "${permission}" which is not in requestedPermissions`,
          ],
          ok: false,
        };
      }
    }
  }

  return { manifest, ok: true };
}
