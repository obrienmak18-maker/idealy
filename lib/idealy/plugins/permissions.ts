import {
  isPluginPermission,
  type PluginInstallation,
  type PluginManifest,
  type PluginPermission,
  type PluginTool,
} from "./types";

export type PermissionDenialCode =
  | "PERMISSION_NOT_GRANTED"
  | "PLUGIN_NOT_AVAILABLE"
  | "TOOL_NOT_FOUND"
  | "CONFIRMATION_REQUIRED"
  | "PLAN_INSUFFICIENT"
  | "DEPENDENCY_MISSING";

export type PermissionCheck =
  | { allowed: true }
  | {
      allowed: false;
      code: PermissionDenialCode;
      reason: string;
      /** Permissions the caller would have to grant to unblock. */
      missingPermissions: readonly PluginPermission[];
    };

export const DENIED = (
  code: PermissionDenialCode,
  reason: string,
  missingPermissions: readonly PluginPermission[] = []
): PermissionCheck => ({ allowed: false, code, missingPermissions, reason });

/** The tool permissions are exactly what the manifest declared. */
export function getToolPermissionSet(
  tool: PluginTool
): ReadonlySet<PluginPermission> {
  return new Set(tool.permissions);
}

/**
 * Server-side permission gate.
 *
 * A caller never receives a capability because a button was visible. The check
 * is purely a function of what the user actually granted on the installation.
 */
export function checkToolPermissions({
  grantedPermissions,
  tool,
}: {
  grantedPermissions: readonly PluginPermission[];
  tool: PluginTool;
}): PermissionCheck {
  const granted = new Set(grantedPermissions);
  const missing = tool.permissions.filter(
    (permission) => !granted.has(permission)
  );
  if (missing.length > 0) {
    return DENIED(
      "PERMISSION_NOT_GRANTED",
      `The tool "${tool.id}" requires permissions that were not granted.`,
      missing
    );
  }
  return { allowed: true };
}

/**
 * Confirmation is part of the permission model: a write/publish/financial tool
 * may never run from a machine request without an explicit human decision.
 */
export function checkToolConfirmation({
  confirmed,
  tool,
}: {
  confirmed: boolean;
  tool: PluginTool;
}): PermissionCheck {
  if (tool.requiresConfirmation && !confirmed) {
    return DENIED(
      "CONFIRMATION_REQUIRED",
      `The tool "${tool.id}" requires an explicit user confirmation.`
    );
  }
  return { allowed: true };
}

/**
 * Plan gating. A user cannot install or run a plugin their plan does not cover,
 * regardless of what the interface displays.
 */
const PLAN_RANK = { business: 2, free: 0, pro: 1 } as const;

export function checkPlanMinimum({
  minimumPlan,
  userPlan,
}: {
  minimumPlan: PluginManifest["minimumPlan"];
  userPlan: keyof typeof PLAN_RANK;
}): PermissionCheck {
  if (PLAN_RANK[userPlan] >= PLAN_RANK[minimumPlan]) {
    return { allowed: true };
  }
  return DENIED(
    "PLAN_INSUFFICIENT",
    `This plugin requires the "${minimumPlan}" plan.`
  );
}

/**
 * Dependencies must be installed first. A missing dependency is a configuration
 * problem, never a silent pass.
 */
export function checkDependencies({
  installedPluginIds,
  manifest,
}: {
  installedPluginIds: ReadonlySet<string>;
  manifest: PluginManifest;
}): PermissionCheck {
  const missing = manifest.dependencies.filter(
    (dependency) => !installedPluginIds.has(dependency)
  );
  if (missing.length > 0) {
    return DENIED(
      "DEPENDENCY_MISSING",
      `Missing plugin dependencies: ${missing.join(", ")}.`
    );
  }
  return { allowed: true };
}

/**
 * The full gate used by the execution pipeline. Every rejection is explicit:
 * no branch here can fall through to a provider call.
 */
export function authorizeToolExecution({
  confirmed,
  grantedPermissions,
  installedPluginIds,
  installation,
  manifest,
  toolId,
  userPlan,
}: {
  confirmed: boolean;
  grantedPermissions: readonly PluginPermission[];
  installedPluginIds: ReadonlySet<string>;
  installation: PluginInstallation | null;
  manifest: PluginManifest;
  toolId: string;
  userPlan: keyof typeof PLAN_RANK;
}): PermissionCheck {
  if (!installation) {
    return DENIED(
      "PLUGIN_NOT_AVAILABLE",
      `The plugin "${manifest.id}" is not installed.`
    );
  }
  if (installation.state === "disabled") {
    return DENIED(
      "PLUGIN_NOT_AVAILABLE",
      `The plugin "${manifest.id}" is disabled.`
    );
  }

  const tool = manifest.tools.find((candidate) => candidate.id === toolId);
  if (!tool) {
    return DENIED(
      "TOOL_NOT_FOUND",
      `The plugin "${manifest.id}" does not expose a tool "${toolId}".`
    );
  }

  const checks: PermissionCheck[] = [
    checkPlanMinimum({ minimumPlan: manifest.minimumPlan, userPlan }),
    checkDependencies({ installedPluginIds, manifest }),
    checkToolPermissions({ grantedPermissions, tool }),
    checkToolConfirmation({ confirmed, tool }),
  ];

  for (const check of checks) {
    if (!check.allowed) {
      return check;
    }
  }
  return { allowed: true };
}

/**
 * Filters requested permissions down to what may actually be granted. Unknown
 * values are dropped rather than stored, so a client cannot widen its own
 * permissions by sending extra strings.
 */
export function sanitizeGrantedPermissions(input: unknown): PluginPermission[] {
  if (!Array.isArray(input)) {
    return [];
  }
  const unique = new Set<PluginPermission>();
  for (const entry of input) {
    if (isPluginPermission(entry)) {
      unique.add(entry);
    }
  }
  return [...unique];
}

/**
 * Grants only the intersection of what the user asked for and what the plugin
 * actually requested. A plugin can never be granted more than it declared.
 */
export function resolveGrantablePermissions({
  manifest,
  requested,
}: {
  manifest: PluginManifest;
  requested: unknown;
}): PluginPermission[] {
  const asked = new Set(sanitizeGrantedPermissions(requested));
  return manifest.requestedPermissions.filter((permission) =>
    asked.has(permission)
  );
}
