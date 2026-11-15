// biome-ignore lint/style/useFilenamingConvention: preserved naming convention
import type { MissionWorkspaceFile } from "../../types";
import type {
  AllowedCommand,
  ProjectRuntimeAdapter,
  RuntimeCapabilities,
  RuntimeEvent,
  RuntimeKind,
  RuntimeSession,
  RuntimeSupportResult,
} from "./types";

export class UnsupportedAdapter implements ProjectRuntimeAdapter {
  readonly kind: RuntimeKind = "unsupported";

  readonly capabilities: RuntimeCapabilities = {
    fileHotReload: false,
    filesystemPersistence: "ephemeral",
    interactivePreview: false,
    isolationLevel: "none",
    serverSideBuild: false,
    terminalExecution: false,
  };

  private readonly reason: string;
  private session: RuntimeSession | null = null;
  private readonly listeners = new Set<(event: RuntimeEvent) => void>();

  constructor(reason?: string) {
    this.reason =
      reason ||
      "L'environnement actuel ne remplit pas les conditions d'isolation sécurisée pour exécuter un aperçu interactif.";
  }

  isSupported(): RuntimeSupportResult {
    return {
      reason: this.reason,
      supported: false,
    };
  }

  async createSession(missionId: string): Promise<RuntimeSession> {
    const sessionId = `unsupported_${Date.now()}`;
    this.session = {
      createdAt: new Date().toISOString(),
      missionId,
      previewUrl: null,
      sessionId,
      state: "unsupported",
    };
    this.emitEvent("runtime.state", {
      reason: this.reason,
      state: "unsupported",
    });
    return await Promise.resolve(this.session);
  }

  getActiveSession(): RuntimeSession | null {
    return this.session;
  }

  async mountProject(_files: MissionWorkspaceFile[]): Promise<void> {
    await Promise.reject(new Error(`Aperçu non supporté : ${this.reason}`));
  }

  async writeFile(_path: string, _content: string): Promise<boolean> {
    return await Promise.resolve(false);
  }

  async executeCommand(
    _cmd: AllowedCommand
  ): Promise<{ exitCode: number; output: string }> {
    return await Promise.reject(
      new Error(`Exécution impossible dans ce navigateur : ${this.reason}`)
    );
  }

  async startDevServer(): Promise<{ url: string }> {
    return await Promise.reject(
      new Error(`Serveur de développement indisponible : ${this.reason}`)
    );
  }

  getPreviewUrl(): string | null {
    return null;
  }

  subscribe(listener: (event: RuntimeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  stopProcess(): void {
    // No-op in unsupported environment
  }

  async destroySession(): Promise<void> {
    this.session = null;
    await Promise.resolve();
  }

  private emitEvent(
    type: RuntimeEvent["type"],
    payload: Record<string, unknown>
  ): void {
    if (!this.session) {
      return;
    }
    const event: RuntimeEvent = {
      at: new Date().toISOString(),
      missionId: this.session.missionId,
      payload,
      sequence: 1,
      sessionId: this.session.sessionId,
      type,
    };
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // ignore listener error
      }
    }
  }
}
