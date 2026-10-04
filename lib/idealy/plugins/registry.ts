import { checkPlanMinimum } from "./permissions";
import type {
  PluginInstallation,
  PluginLifecycleState,
  PluginManifest,
  PluginPermission,
  PublicPlugin,
  ValidPluginManifest,
} from "./types";

/**
 * Allowed lifecycle transitions.
 *
 * A plugin can never jump straight to `available`: it must pass through
 * installed -> configured -> authorized. This is what stops a UI button from
 * manufacturing a connected state.
 */
const TRANSITIONS: Readonly<
  Record<PluginLifecycleState, readonly PluginLifecycleState[]>
> = {
  authorized: ["available", "configured", "disabled", "error"],
  available: ["executing", "disabled", "error"],
  configured: ["authorized", "installed", "disabled", "error"],
  disabled: ["installed", "configured"],
  discovered: ["installed", "disabled"],
  error: ["installed", "configured", "authorized", "disabled"],
  executing: ["available", "error", "disabled"],
  installed: ["configured", "authorized", "disabled", "error"],
};

export function canTransition(
  from: PluginLifecycleState,
  to: PluginLifecycleState
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(
  from: PluginLifecycleState,
  to: PluginLifecycleState
): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal plugin lifecycle transition: ${from} -> ${to}`);
  }
}

// ─── Requirement evaluation ─────────────────────────────────────────────────

export type EnvironmentFacts = {
  /** Names of the server-side env vars that are actually present. */
  presentSecretEnvNames: ReadonlySet<string>;
  /** OAuth scopes actually granted on the linked connector. */
  grantedScopes: ReadonlySet<string>;
  /** True when the plugin's connector is linked and active. */
  connectorActive: boolean;
  /** True when the plugin's configuration has been provided by the user. */
  hasConfiguration: boolean;
};

/**
 * Lists what still blocks the plugin from running. An empty list means the
 * plugin is genuinely available; a non-empty list is what the UI renders as
 * "configuration required".
 */
export function missingRequirements({
  facts,
  manifest,
}: {
  facts: EnvironmentFacts;
  manifest: PluginManifest;
}): string[] {
  const missing: string[] = [];

  if (!facts.hasConfiguration) {
    missing.push("configuration");
  }
  for (const envName of manifest.requirements.requiredSecretEnvNames) {
    if (!facts.presentSecretEnvNames.has(envName)) {
      missing.push(`server_secret:${envName}`);
    }
  }
  if (manifest.requirements.requiredScopes.length > 0) {
    if (facts.connectorActive) {
      const lacking = manifest.requirements.requiredScopes.filter(
        (scope) => !hasGrantedScope(facts.grantedScopes, scope)
      );
      if (lacking.length > 0) {
        missing.push(`scope:${lacking.join(",")}`);
      }
    } else {
      missing.push("authorization");
    }
  } else if (
    manifest.requirements.connectorProvider &&
    !facts.connectorActive
  ) {
    missing.push("authorization");
  }

  return missing;
}

/** GitHub's broader `user` OAuth scope also satisfies its `read:user` scope. */
function hasGrantedScope(grantedScopes: ReadonlySet<string>, requiredScope: string) {
  return (
    grantedScopes.has(requiredScope) ||
    (requiredScope === "read:user" && grantedScopes.has("user"))
  );
}

/**
 * Derives the effective state from real facts instead of trusting a stored
 * flag. A plugin is `available` only when nothing is missing.
 */
export function resolveState({
  facts,
  installation,
  manifest,
}: {
  facts: EnvironmentFacts;
  installation: PluginInstallation | null;
  manifest: PluginManifest;
}): PluginLifecycleState {
  if (!installation) {
    return "discovered";
  }
  if (installation.state === "disabled" || installation.state === "error") {
    return installation.state;
  }
  return missingRequirements({ facts, manifest }).length === 0
    ? "available"
    : installation.state;
}

// ─── Registry ───────────────────────────────────────────────────────────────

export type PluginRegistry = {
  list: () => readonly ValidPluginManifest[];
  get: (pluginId: string) => ValidPluginManifest | undefined;
  has: (pluginId: string) => boolean;
  /** Detects dependency cycles and returns plugins in install order. */
  resolveInstallOrder: (pluginIds: readonly string[]) => {
    ok: boolean;
    order: string[];
    errors: string[];
  };
};

/**
 * Builds a registry from validated manifests. Invalid manifests are rejected at
 * the boundary rather than being silently skipped.
 */
export function createPluginRegistry(
  manifests: readonly ValidPluginManifest[]
): PluginRegistry {
  const byId = new Map<string, ValidPluginManifest>();
  for (const manifest of manifests) {
    if (byId.has(manifest.id)) {
      throw new Error(`Duplicate plugin id in registry: ${manifest.id}`);
    }
    byId.set(manifest.id, manifest);
  }

  for (const manifest of byId.values()) {
    for (const dependency of manifest.dependencies) {
      if (!byId.has(dependency)) {
        throw new Error(
          `Plugin "${manifest.id}" depends on unknown plugin "${dependency}"`
        );
      }
    }
  }

  return {
    get: (pluginId) => byId.get(pluginId),
    has: (pluginId) => byId.has(pluginId),
    list: () => [...byId.values()],

    resolveInstallOrder(pluginIds) {
      const errors: string[] = [];
      const wanted = new Set(pluginIds.filter((id) => byId.has(id)));
      for (const id of pluginIds) {
        if (!byId.has(id)) {
          errors.push(`Unknown plugin: ${id}`);
        }
      }
      const order: string[] = [];
      const visiting = new Set<string>();
      const visited = new Set<string>();

      const visit = (id: string): boolean => {
        if (visited.has(id)) {
          return true;
        }
        if (visiting.has(id)) {
          errors.push(`Dependency cycle detected at plugin "${id}"`);
          return false;
        }
        const manifest = byId.get(id);
        if (!manifest) {
          return false;
        }
        visiting.add(id);
        for (const dependency of manifest.dependencies) {
          // A dependency outside the selection must be installed too.
          wanted.add(dependency);
          if (!visit(dependency)) {
            return false;
          }
        }
        visiting.delete(id);
        visited.add(id);
        order.push(id);
        return true;
      };

      for (const id of [...wanted]) {
        visit(id);
      }

      return errors.length > 0
        ? { errors, ok: false, order: [] }
        : { errors, ok: true, order };
    },
  };
}

/**
 * Builds the browser-safe projection. Secrets, tokens and connector internals
 * are structurally absent from this type.
 */
export function toPublicPlugin({
  facts,
  installation,
  manifest,
  userPlan,
}: {
  facts: EnvironmentFacts;
  installation: PluginInstallation | null;
  manifest: PluginManifest;
  userPlan: "free" | "pro" | "business";
}): PublicPlugin {
  const state = resolveState({ facts, installation, manifest });
  const missing = missingRequirements({ facts, manifest });
  const installed = installation !== null;
  const planOk = checkPlanMinimum({
    minimumPlan: manifest.minimumPlan,
    userPlan,
  }).allowed;

  return {
    available: installed && state === "available" && planOk,
    category: manifest.category,
    configurationRequired: !installed || missing.length > 0 || !planOk,
    description: manifest.description,
    grantedPermissions: installation?.grantedPermissions ?? [],
    id: manifest.id,
    installed,
    missingRequirements: [...missing, ...(planOk ? [] : ["plan"])],
    name: manifest.name,
    requestedPermissions: manifest.requestedPermissions,
    requiresAuthorization:
      manifest.requirements.requiredScopes.length > 0 ||
      Boolean(manifest.requirements.connectorProvider),
    state: planOk ? state : ("discovered" as PluginLifecycleState),
    tools: manifest.tools.map((tool) => ({
      id: tool.id,
      label: tool.label,
      requiresConfirmation: tool.requiresConfirmation,
      risk: tool.risk,
    })),
    transport: manifest.transport,
    version: manifest.version,
  };
}

/** Permissions a plugin will hold once fully installed and authorized. */
export function effectivePermissions(
  manifest: PluginManifest,
  granted: readonly PluginPermission[]
): readonly PluginPermission[] {
  return manifest.requestedPermissions.filter((permission) =>
    granted.includes(permission)
  );
}
