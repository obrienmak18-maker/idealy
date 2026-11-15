import type { ProjectRuntimeAdapter, RuntimeKind } from "./types";
import { UnsupportedAdapter } from "./unsupportedAdapter";
import { WebcontainerAdapter } from "./webcontainerAdapter";

export * from "./security";
export * from "./types";
export { UnsupportedAdapter } from "./unsupportedAdapter";
export { WebcontainerAdapter } from "./webcontainerAdapter";

let sharedWebcontainerAdapter: WebcontainerAdapter | null = null;

/**
 * Resolves or instantiates the appropriate ProjectRuntimeAdapter for the current environment.
 * Evaluates browser support, security isolation, and hardware constraints.
 */
export function getRuntimeAdapter(
  preferredKind: RuntimeKind = "webcontainer"
): ProjectRuntimeAdapter {
  if (preferredKind === "webcontainer") {
    sharedWebcontainerAdapter ??= new WebcontainerAdapter();
    const check = sharedWebcontainerAdapter.isSupported();
    if (!check.supported) {
      return new UnsupportedAdapter(check.reason);
    }
    return sharedWebcontainerAdapter;
  }

  if (preferredKind === "unsupported") {
    return new UnsupportedAdapter();
  }

  // Extensible for future adapters (e.g. E2B cloud microVM)
  return new UnsupportedAdapter(
    `Le runtime « ${preferredKind} » n'est pas encore implémenté.`
  );
}
