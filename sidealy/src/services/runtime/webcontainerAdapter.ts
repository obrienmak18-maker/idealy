// biome-ignore lint/style/useFilenamingConvention: preserved naming convention
import {
  configureAPIKey,
  type FileSystemTree,
  WebContainer,
  type WebContainerProcess,
} from "@webcontainer/api";
import type { MissionWorkspaceFile } from "../../types";

let configuredCommercialApiKey: string | null = null;

function configureCommercialWebContainerApi(): void {
  const environment = import.meta.env as Record<string, string | undefined>;
  const apiKey = environment.VITE_WEBCONTAINER_API_KEY?.trim();
  if (!apiKey || configuredCommercialApiKey === apiKey) return;

  // StackBlitz requires this to run before the first WebContainer.boot().
  configureAPIKey(apiKey);
  configuredCommercialApiKey = apiKey;
}
import {
  isAllowedWorkspacePath,
  sanitizeWorkspacePath,
  validateAllowedCommand,
} from "./security";
import type {
  AllowedCommand,
  ProjectRuntimeAdapter,
  RuntimeCapabilities,
  RuntimeEvent,
  RuntimeKind,
  RuntimeSession,
  RuntimeState,
  RuntimeSupportResult,
} from "./types";

export class WebcontainerAdapter implements ProjectRuntimeAdapter {
  readonly kind: RuntimeKind = "webcontainer";

  readonly capabilities: RuntimeCapabilities = {
    fileHotReload: true,
    filesystemPersistence: "ephemeral",
    interactivePreview: true,
    isolationLevel: "browser-wasm",
    maxDurationSeconds: 120,
    serverSideBuild: false,
    terminalExecution: true,
  };

  private containerPromise: Promise<WebContainer> | null = null;
  private activeProcess: WebContainerProcess | null = null;
  private activeSession: RuntimeSession | null = null;
  private readonly listeners = new Set<(event: RuntimeEvent) => void>();
  private sequence = 0;
  private cleanupReadyWait: (() => void) | null = null;

  isSupported(): RuntimeSupportResult {
    if (typeof window === "undefined") {
      return {
        reason:
          "Le runtime d'aperçu WebContainer nécessite un environnement de navigateur.",
        supported: false,
      };
    }

    if (!window.crossOriginIsolated) {
      return {
        reason:
          "L'isolation inter-origines (crossOriginIsolated) est requise. Vérifiez les en-têtes COOP (same-origin) et COEP (credentialless).",
        supported: false,
      };
    }

    if (typeof SharedArrayBuffer === "undefined") {
      return {
        reason:
          "SharedArrayBuffer est indisponible dans ce contexte de navigation.",
        supported: false,
      };
    }

    const ua = navigator.userAgent.toLowerCase();
    const isFirefox = ua.includes("firefox");
    const isSafari =
      ua.includes("safari") &&
      !ua.includes("chrome") &&
      !ua.includes("chromium");
    const isMobile =
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);

    if (isMobile) {
      return {
        reason:
          "L'aperçu interactif n'est pas supporté sur mobile. Utilisez un navigateur Chromium sur ordinateur.",
        supported: false,
      };
    }

    if (isSafari) {
      return {
        reason:
          "Safari ne supporte pas actuellement le mode COEP credentialless requis pour WebContainer. Utilisez Google Chrome ou Microsoft Edge sur ordinateur.",
        supported: false,
      };
    }

    if (isFirefox) {
      return {
        reason:
          "L'aperçu WebContainer est actuellement en version bêta sous Firefox et peut être instable. Pour une compatibilité garantie, privilégiez Chrome ou Edge.",
        supported: false,
        warning: "Environnement Firefox détecté.",
      };
    }

    return { supported: true };
  }

  private async getContainer(): Promise<WebContainer> {
    const support = this.isSupported();
    if (!support.supported) {
      throw new Error(support.reason || "Environnement non supporté.");
    }

    this.containerPromise ??= Promise.resolve().then(() => {
      configureCommercialWebContainerApi();
      return WebContainer.boot({
        coep: "credentialless",
        workdirName: "idealy",
      });
    }).catch((error: unknown) => {
      this.containerPromise = null;
      throw error;
    });

    return await this.containerPromise;
  }

  private emitEvent(
    type: RuntimeEvent["type"],
    payload: Record<string, unknown>
  ): void {
    if (!this.activeSession) {
      return;
    }
    this.sequence += 1;
    const event: RuntimeEvent = {
      at: new Date().toISOString(),
      missionId: this.activeSession.missionId,
      payload,
      sequence: this.sequence,
      sessionId: this.activeSession.sessionId,
      type,
    };
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error("Runtime listener error:", err);
      }
    }
  }

  private transitionState(
    newState: RuntimeState,
    meta?: Record<string, unknown>
  ): void {
    if (!this.activeSession) {
      return;
    }
    this.activeSession.state = newState;
    this.emitEvent("runtime.state", { state: newState, ...(meta || {}) });
  }

  async createSession(missionId: string): Promise<RuntimeSession> {
    // If a session already exists (for same or other mission), tear it down cleanly
    if (this.activeSession) {
      await this.destroySession();
    }

    const sessionId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    this.sequence = 0;
    this.activeSession = {
      createdAt: new Date().toISOString(),
      missionId,
      previewUrl: null,
      sessionId,
      state: "idle",
    };

    this.transitionState("idle", {
      message: "Session de runtime initialisée.",
    });
    return this.activeSession;
  }

  getActiveSession(): RuntimeSession | null {
    return this.activeSession;
  }

  async mountProject(files: MissionWorkspaceFile[]): Promise<void> {
    if (!this.activeSession) {
      throw new Error(
        "Aucune session de runtime active. Appelez createSession() au préalable."
      );
    }

    this.transitionState("booting");
    const container = await this.getContainer();

    // Secure file tree construction
    const tree: FileSystemTree = {};
    const validFiles = new Map<string, MissionWorkspaceFile>();

    for (const file of files) {
      if (file.status && !["saved", "validated"].includes(file.status)) {
        continue;
      }

      const pathCheck = isAllowedWorkspacePath(file.path);
      if (!pathCheck.allowed) {
        // Log rejection of sensitive/forbidden files without breaking entire mount
        console.warn(
          `[Runtime Security] Fichier ignoré lors du montage : ${file.path} (${pathCheck.reason})`
        );
        continue;
      }

      const normalized = file.path.replaceAll("\\", "/").replace(/^\/+/, "");
      const previous = validFiles.get(normalized);
      if (!previous || (file.version ?? 0) >= (previous.version ?? 0)) {
        validFiles.set(normalized, file);
      }
    }

    for (const [path, file] of validFiles) {
      const segments = path.split("/");
      let cursor = tree;
      for (const segment of segments.slice(0, -1)) {
        const existing = cursor[segment];
        if (existing && !("directory" in existing)) {
          throw new Error(
            `Le chemin « ${segment} » est déjà utilisé comme fichier.`
          );
        }
        if (!existing) {
          cursor[segment] = { directory: {} };
        }
        cursor = (cursor[segment] as { directory: FileSystemTree }).directory;
      }
      const fileName = segments.at(-1) ?? "";
      const targetNode = cursor[fileName];
      if (targetNode && "directory" in targetNode) {
        throw new Error(
          `Le chemin « ${path} » est déjà utilisé comme dossier.`
        );
      }
      cursor[fileName] = { file: { contents: file.content ?? "" } };
    }

    // Clean previous workspace and mount fresh tree
    await container.fs
      .rm("workspace", { force: true, recursive: true })
      .catch(() => {
        // Ignore removal error if workspace doesn't exist
      });
    await container.mount(tree, { mountPoint: "workspace" });
  }

  async writeFile(path: string, content: string): Promise<boolean> {
    if (!this.activeSession) {
      return false;
    }
    const sanitized = sanitizeWorkspacePath(path);
    const container = await this.getContainer();
    await container.fs.writeFile(sanitized, content);
    return true;
  }

  async executeCommand(
    cmd: AllowedCommand,
    opts?: {
      signal?: AbortSignal;
      onOutput?: (chunk: string) => void;
    }
  ): Promise<{ exitCode: number; output: string }> {
    if (!this.activeSession) {
      throw new Error("Aucune session active pour exécuter une commande.");
    }

    const validation = validateAllowedCommand(cmd);
    if (!validation.valid) {
      throw new Error(
        `Commande rejetée par la sécurité du runtime : ${validation.reason}`
      );
    }

    const container = await this.getContainer();
    this.emitEvent("terminal.command", {
      command: `${validation.binary} ${validation.args.join(" ")}`,
      kind: cmd.kind,
    });

    const process = await container.spawn(validation.binary, validation.args, {
      cwd: "workspace",
      terminal: { cols: 84, rows: 20 },
    });

    this.activeProcess = process;
    let combinedOutput = "";

    const reader = process.output.getReader();
    const readPromise = (async () => {
      try {
        while (true) {
          if (opts?.signal?.aborted) {
            process.kill();
            break;
          }
          // biome-ignore lint/performance/noAwaitInLoops: sequential stream reading is required
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          if (value) {
            combinedOutput += value;
            opts?.onOutput?.(value);
            this.emitEvent("terminal.output", { chunk: value });
          }
        }
      } finally {
        reader.releaseLock();
      }
    })();

    const exitCode = await process.exit;
    await readPromise;

    if (this.activeProcess === process) {
      this.activeProcess = null;
    }

    return { exitCode, output: combinedOutput };
  }

  async startDevServer(opts?: {
    onOutput?: (chunk: string) => void;
  }): Promise<{ url: string }> {
    if (!this.activeSession) {
      throw new Error(
        "Aucune session active pour démarrer le serveur de développement."
      );
    }

    const container = await this.getContainer();

    // 1. Dependency installation step
    this.transitionState("installing");
    const hasLockfile = await container.fs
      .readFile("workspace/package-lock.json")
      .then(() => true)
      .catch(() => false);

    const installCmd: AllowedCommand = hasLockfile
      ? { kind: "npm-ci" }
      : { kind: "npm-install" };
    opts?.onOutput?.(
      `\n$ npm ${hasLockfile ? "ci" : "install"} --ignore-scripts\n`
    );

    const installResult = await this.executeCommand(installCmd, {
      onOutput: opts?.onOutput,
    });

    if (installResult.exitCode !== 0) {
      this.transitionState("error", {
        message: `L'installation des dépendances a échoué (code ${installResult.exitCode}).`,
      });
      throw new Error(
        `npm ${hasLockfile ? "ci" : "install"} s'est terminé avec le code ${installResult.exitCode}.`
      );
    }

    // 2. Read package.json to identify dev script and framework flags
    const manifestRaw = await container.fs.readFile(
      "workspace/package.json",
      "utf8"
    );
    const manifest = JSON.parse(manifestRaw) as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const startScript =
      typeof manifest.scripts?.dev === "string"
        ? "dev"
        : typeof manifest.scripts?.start === "string"
          ? "start"
          : null;

    if (!startScript) {
      throw new Error(
        "package.json ne contient ni script « dev » ni script « start »."
      );
    }

    const allDeps = {
      ...(manifest.dependencies || {}),
      ...(manifest.devDependencies || {}),
    };

    const serverArgs = allDeps.next
      ? ["--", "--hostname", "0.0.0.0"]
      : allDeps.vite || allDeps.astro
        ? ["--", "--host", "0.0.0.0"]
        : [];

    this.transitionState("starting");
    opts?.onOutput?.(`\n$ npm run ${startScript} ${serverArgs.join(" ")}\n`);

    const readyPromise = new Promise<string>((resolve, reject) => {
      let settled = false;
      const timeout = window.setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        this.cleanupReadyWait?.();
        reject(
          new Error(
            "Le serveur n’a pas ouvert de port après 120 secondes. Consultez la sortie du terminal pour diagnostiquer l’erreur."
          )
        );
      }, 120_000);

      const unsubscribe = container.on("server-ready", (_port, url) => {
        if (settled) {
          return;
        }
        settled = true;
        window.clearTimeout(timeout);
        unsubscribe();
        resolve(url);
      });

      this.cleanupReadyWait = () => {
        window.clearTimeout(timeout);
        unsubscribe();
      };
    });

    const devProcess = await container.spawn(
      "npm",
      ["run", startScript, ...serverArgs],
      { cwd: "workspace", terminal: { cols: 84, rows: 20 } }
    );

    this.activeProcess = devProcess;

    // Stream dev server logs
    (async () => {
      const reader = devProcess.output.getReader();
      try {
        while (true) {
          // biome-ignore lint/performance/noAwaitInLoops: sequential stream reading is required
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          if (value) {
            opts?.onOutput?.(value);
            this.emitEvent("terminal.output", { chunk: value });
          }
        }
      } catch (err) {
        opts?.onOutput?.(
          `\nErreur flux terminal : ${err instanceof Error ? err.message : String(err)}\n`
        );
      } finally {
        reader.releaseLock();
      }
    })().catch((streamErr) => {
      console.error("Erreur flux logs dev server:", streamErr);
    });

    devProcess.exit
      .then((code) => {
        if (this.activeProcess === devProcess) {
          this.activeProcess = null;
        }
        if (
          this.activeSession?.state === "ready" ||
          this.activeSession?.state === "starting"
        ) {
          this.transitionState(code === 0 ? "stopped" : "error", {
            exitCode: code,
          });
        }
      })
      .catch((exitErr) => {
        console.error("Erreur devProcess exit:", exitErr);
      });

    const previewUrl = await readyPromise;
    this.activeSession.previewUrl = previewUrl;
    this.transitionState("ready", { url: previewUrl });
    this.emitEvent("preview.ready", { url: previewUrl });
    opts?.onOutput?.(
      `\n[Aperçu prêt] Application interactive disponible sur ${previewUrl}\n`
    );

    return { url: previewUrl };
  }

  getPreviewUrl(): string | null {
    return this.activeSession?.previewUrl ?? null;
  }

  subscribe(listener: (event: RuntimeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  stopProcess(): void {
    if (this.cleanupReadyWait) {
      this.cleanupReadyWait();
      this.cleanupReadyWait = null;
    }
    if (this.activeProcess) {
      try {
        this.activeProcess.kill();
      } catch {
        // Process might have already terminated
      }
      this.activeProcess = null;
    }
    if (this.activeSession && this.activeSession.state !== "stopped") {
      this.transitionState("stopped");
    }
  }

  async destroySession(): Promise<void> {
    this.stopProcess();
    if (this.activeSession) {
      this.transitionState("stopped", {
        message: "Destruction de la session.",
      });
      this.activeSession = null;
    }
    if (this.containerPromise) {
      const container = await this.containerPromise.catch(() => null);
      if (container) {
        await container.fs
          .rm("workspace", { force: true, recursive: true })
          .catch(() => {
            // Ignore cleanup errors
          });
      }
    }
  }
}
