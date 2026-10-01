export * from "./catalog";
export * from "./execution";
export * from "./manifest";
export * from "./permissions";
export * from "./registry";
export * from "./types";

import { PLUGIN_MANIFESTS } from "./catalog";
import { createPluginRegistry } from "./registry";

/**
 * The process-wide plugin registry, built from the validated manifests.
 *
 * This is the single plugin engine. It does not coexist with the connector
 * catalog: plugins wrap connectors, tools, skills and agents.
 */
export const pluginRegistry = createPluginRegistry(PLUGIN_MANIFESTS);
