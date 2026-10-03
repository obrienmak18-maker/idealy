/**
 * Idealy Plugin Contract.
 *
 * A plugin is a functional extension of Idealy. It is NOT the same thing as a
 * connector (a link to an external service), a tool (an executable action), a
 * skill (a specialised capability) or an agent (a reasoning component).
 *
 * A plugin may bundle any of those, but the concepts stay distinct:
 *
 *   PLUGIN   -> functional extension, owns a manifest + a lifecycle
 *   CONNECTOR -> connection to an external service (user_integrations)
 *   TOOL     -> executable action exposed by a plugin
 *   SKILL    -> specialised capability declared by a plugin
 *   AGENT    -> specialised reasoning component declared by a plugin
 *   MCP      -> transport used to reach remote tools
 *
 * Lifecycle:
 *   DISCOVERED -> INSTALLED -> CONFIGURED -> AUTHORIZED -> AVAILABLE
 *              -> EXECUTING -> DISABLED
 *
 * A plugin is only `AVAILABLE` when it is installed, configured, authorized and
 * not disabled. Anything less is reported as `CONFIGURATION_REQUIRED`, never as
 * `CONNECTED`.
 */

// ─── Permissions ─────────────────────────────────────────────────────────────
// Server-enforced capability strings. A visible button grants nothing: every
// execution is checked against these before reaching a provider.

export const PLUGIN_PERMISSIONS = [
  "project.read",
  "project.write",
  "files.read",
  "files.write",
  "tool.execute",
  "code.execute",
  "network.access",
  "repository.read",
  "repository.write",
  "deployment.execute",
  "asset.generate",
] as const;

export type PluginPermission = (typeof PLUGIN_PERMISSIONS)[number];

export function isPluginPermission(value: unknown): value is PluginPermission {
  return (
    typeof value === "string" &&
    (PLUGIN_PERMISSIONS as readonly string[]).includes(value)
  );
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

export const PLUGIN_LIFECYCLE_STATES = [
  "discovered",
  "installed",
  "configured",
  "authorized",
  "available",
  "executing",
  "disabled",
  "error",
] as const;

export type PluginLifecycleState = (typeof PLUGIN_LIFECYCLE_STATES)[number];

export type PluginTransport = "native" | "mcp" | "http";

export type PluginRisk = "read" | "write" | "publish" | "financial";

// ─── Declarations ────────────────────────────────────────────────────────────

/** An executable action exposed by a plugin. */
export type PluginTool = {
  description: string;
  /** Stable id, unique inside the plugin. */
  id: string;
  label: string;
  /** Permissions required to execute this tool. Checked server-side. */
  permissions: readonly PluginPermission[];
  risk: PluginRisk;
  /** When true the caller must confirm before the tool runs. */
  requiresConfirmation: boolean;
};

/** A specialised capability declared by a plugin. */
export type PluginSkill = {
  description: string;
  id: string;
  label: string;
};

/** A specialised reasoning component declared by a plugin. */
export type PluginAgent = {
  description: string;
  id: string;
  label: string;
};

/** Everything a plugin needs before it can be considered runnable. */
export type PluginRequirements = {
  /** Provider this plugin connects to, when it owns a connector. */
  connectorProvider?: string;
  /** Server-side secrets that must exist before the plugin can run. */
  requiredSecretEnvNames: readonly string[];
  /** OAuth scopes required to authorize the plugin. */
  requiredScopes: readonly string[];
};

// ─── Manifest ────────────────────────────────────────────────────────────────

export type PluginManifest = {
  /** Stable, human-readable identifier. Used as the persistence key. */
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  category: string;
  homepage?: string;
  /** Other plugin ids that must be installed first. */
  dependencies: readonly string[];
  /** Permissions the plugin asks for at install time. */
  requestedPermissions: readonly PluginPermission[];
  tools: readonly PluginTool[];
  skills: readonly PluginSkill[];
  agents: readonly PluginAgent[];
  requirements: PluginRequirements;
  transport: PluginTransport;
  /** Minimum Idealy plan required before install is allowed. */
  minimumPlan: "free" | "pro" | "business";
};

/** A validated manifest. Constructed only through `parsePluginManifest`. */
export type ValidPluginManifest = PluginManifest & {
  readonly __validated: true;
};

// ─── Installation record ─────────────────────────────────────────────────────

export type PluginInstallation = {
  pluginId: string;
  pluginVersion: string;
  userId: string;
  workspaceId: string | null;
  state: PluginLifecycleState;
  /** Permissions the user actually granted (subset of the manifest request). */
  grantedPermissions: readonly PluginPermission[];
  /** Connector provider linked to this installation, when applicable. */
  connectorProvider: string | null;
  configuration: Readonly<Record<string, unknown>>;
  installedAt: string | null;
  configuredAt: string | null;
  authorizedAt: string | null;
  disabledAt: string | null;
  lastError: string | null;
};

// ─── Execution ───────────────────────────────────────────────────────────────

export type PluginExecutionStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "denied"
  | "cancelled";

export type PluginExecution = {
  id: string;
  pluginId: string;
  pluginVersion: string;
  toolId: string;
  missionId: string | null;
  taskId: string | null;
  workspaceId: string | null;
  /** The authenticated user on whose behalf the tool ran. */
  actorUserId: string;
  input: unknown;
  output: unknown;
  error: string | null;
  errorCode: string | null;
  status: PluginExecutionStatus;
  attempts: number;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
};

// ─── Public projection ───────────────────────────────────────────────────────

/** Safe to send to a browser. Never contains secrets or tokens. */
export type PublicPlugin = {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  state: PluginLifecycleState;
  installed: boolean;
  available: boolean;
  /** True when the plugin cannot run yet and the user must act. */
  configurationRequired: boolean;
  missingRequirements: readonly string[];
  grantedPermissions: readonly PluginPermission[];
  requestedPermissions: readonly PluginPermission[];
  tools: readonly Pick<
    PluginTool,
    "id" | "label" | "risk" | "requiresConfirmation"
  >[];
  requiresAuthorization: boolean;
  transport: PluginTransport;
};
