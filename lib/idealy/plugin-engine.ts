export type PluginLifecycle =
  | "discovered"
  | "installed"
  | "configured"
  | "authorized"
  | "available"
  | "executing"
  | "disabled";

export type PluginPermission =
  | "repository.read"
  | "repository.write"
  | "pull_request.create"
  | "design.read"
  | "design.write"
  | "deployment.preview"
  | "deployment.production"
  | "database.read"
  | "database.write"
  | "message.send";

export type PluginCapability = "connector" | "skill" | "command" | "agent" | "tool" | "workflow";

export type IdealyPluginManifest = {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  capabilities: PluginCapability[];
  permissions: PluginPermission[];
  dependencies?: string[];
};

export type IdealyPlugin = IdealyPluginManifest & {
  lifecycle: PluginLifecycle;
  enabled: boolean;
  health: "unknown" | "healthy" | "degraded" | "unavailable";
  connectorId?: string;
};

const internalPlugins: IdealyPlugin[] = [
  {
    id: "idealy.design",
    name: "Design Engine",
    version: "1.0.0",
    description: "Design contracts, visual inspection and preview validation.",
    author: "Idealy",
    capabilities: ["skill", "tool", "workflow"],
    permissions: ["design.read", "design.write"],
    lifecycle: "available",
    enabled: true,
    health: "healthy",
  },
  {
    id: "idealy.deployment",
    name: "Deployment",
    version: "1.0.0",
    description: "Preview and production deployment operations with explicit confirmation.",
    author: "Idealy",
    capabilities: ["connector", "command", "tool"],
    permissions: ["deployment.preview", "deployment.production"],
    lifecycle: "configured",
    enabled: true,
    health: "unknown",
    connectorId: "vercel",
  },
];

export function listIdealyPlugins(): IdealyPlugin[] {
  return internalPlugins.map((plugin) => ({ ...plugin, permissions: [...plugin.permissions] }));
}

export function canExecutePlugin(plugin: IdealyPlugin, permission: PluginPermission): boolean {
  return plugin.enabled && plugin.lifecycle === "available" && plugin.permissions.includes(permission);
}

export function transitionPlugin(plugin: IdealyPlugin, next: PluginLifecycle): IdealyPlugin {
  const allowed: Record<PluginLifecycle, PluginLifecycle[]> = {
    discovered: ["installed", "disabled"],
    installed: ["configured", "disabled"],
    configured: ["authorized", "disabled"],
    authorized: ["available", "disabled"],
    available: ["executing", "disabled"],
    executing: ["available", "disabled"],
    disabled: ["installed", "configured"],
  };
  if (!allowed[plugin.lifecycle].includes(next)) {
    throw new Error(`Invalid plugin transition: ${plugin.lifecycle} -> ${next}`);
  }
  return { ...plugin, lifecycle: next };
}

export function assertPluginPermission(plugin: IdealyPlugin, permission: PluginPermission) {
  if (!canExecutePlugin(plugin, permission)) {
    throw new Error(`Plugin ${plugin.id} is not authorized for ${permission}`);
  }
}

export function getPluginStatusLabel(plugin: IdealyPlugin): string {
  if (plugin.lifecycle === "available") return "Disponible";
  if (plugin.lifecycle === "authorized") return "Autorisé · configuration finale requise";
  if (plugin.lifecycle === "configured") return "Configuré · autorisation requise";
  if (plugin.lifecycle === "disabled") return "Désactivé";
  return "Installation en cours";
}

export const idealyPluginEngine = {
  list: listIdealyPlugins,
  canExecute: canExecutePlugin,
  transition: transitionPlugin,
  assertPermission: assertPluginPermission,
};

export type PluginExecutionNode = {
  id: string;
  dependsOn: string[];
  owner: "architect" | "builder" | "reviewer" | "runtime";
  status: "pending" | "running" | "completed" | "failed";
  input?: string;
  output?: string;
  error?: string;
};

export function getReadyExecutionNodes(nodes: PluginExecutionNode[]) {
  return nodes.filter(
    (node) =>
      node.status === "pending" &&
      node.dependsOn.every((dependency) => nodes.some((candidate) => candidate.id === dependency && candidate.status === "completed"))
  );
}
