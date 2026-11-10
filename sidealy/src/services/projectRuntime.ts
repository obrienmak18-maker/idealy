// biome-ignore lint/style/useFilenamingConvention: preserved for backward compatibility
import type { MissionWorkspaceFile } from "../types";
import { getRuntimeAdapter, type RuntimeEvent } from "./runtime";

export type ProjectRuntimeState =
  | "booting"
  | "installing"
  | "starting"
  | "ready"
  | "stopped"
  | "error";

export type ProjectRuntimeCallbacks = {
  onOutput: (text: string) => void;
  onState: (state: ProjectRuntimeState) => void;
};

// Singleton adapter instance used for backward compatibility
const adapter = getRuntimeAdapter("webcontainer");

export async function updateProjectPreviewFile(
  path: string,
  content: string
): Promise<boolean> {
  return await adapter.writeFile(path, content);
}

export async function startProjectPreview(
  files: MissionWorkspaceFile[],
  callbacks: ProjectRuntimeCallbacks
): Promise<string> {
  const support = adapter.isSupported();
  if (!support.supported) {
    callbacks.onState("error");
    callbacks.onOutput(`\n[Erreur de compatibilité] ${support.reason}\n`);
    throw new Error(support.reason);
  }

  // Subscribe to runtime events to forward to legacy callbacks
  adapter.subscribe((event: RuntimeEvent) => {
    if (event.type === "runtime.state") {
      const state = event.payload.state as string;
      if (
        state === "booting" ||
        state === "installing" ||
        state === "starting" ||
        state === "ready" ||
        state === "stopped" ||
        state === "error"
      ) {
        callbacks.onState(state as ProjectRuntimeState);
      }
    } else if (event.type === "terminal.output") {
      const chunk = event.payload.chunk as string;
      if (chunk) {
        callbacks.onOutput(chunk);
      }
    }
  });

  try {
    // 1. Initialize session with generated mission ID
    await adapter.createSession(`mission_legacy_${Date.now()}`);

    // 2. Mount files
    await adapter.mountProject(files);

    // 3. Start dev server and stream output
    const { url } = await adapter.startDevServer({
      onOutput: (chunk) => callbacks.onOutput(chunk),
    });

    return url;
  } catch (error) {
    callbacks.onState("error");
    throw error;
  }
}

export function stopProjectPreview(): void {
  adapter.stopProcess();
}
