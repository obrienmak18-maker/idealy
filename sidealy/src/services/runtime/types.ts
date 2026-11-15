import type { MissionWorkspaceFile } from "../../types";

export type RuntimeKind = "webcontainer" | "e2b" | "unsupported";

export type RuntimeState =
  | "idle"
  | "booting"
  | "installing"
  | "starting"
  | "ready"
  | "stopped"
  | "error"
  | "unsupported";

export interface RuntimeCapabilities {
  /** Supports file hot reloading (HMR) without restarting */
  readonly fileHotReload: boolean;
  /** Filesystem persistence model */
  readonly filesystemPersistence: "ephemeral" | "persisted" | "remote";
  /** Can render an interactive iframe in the browser */
  readonly interactivePreview: boolean;
  /** Process isolation boundary */
  readonly isolationLevel: "browser-wasm" | "cloud-microvm" | "none";
  /** Optional hard execution timeout */
  readonly maxDurationSeconds?: number;
  /** Executes full production server-side build validation (e.g. E2B) */
  readonly serverSideBuild: boolean;
  /** Supports interactive terminal command execution */
  readonly terminalExecution: boolean;
}

export interface RuntimeSession {
  /** ISO timestamp when the session was initialized */
  readonly createdAt: string;
  /** Mission ID tied to this session */
  readonly missionId: string;
  /** Active preview URL if server is ready */
  previewUrl: string | null;
  /** Unique session ID (UUID v4) generated per session */
  readonly sessionId: string;
  /** Current state of this session */
  state: RuntimeState;
}

export type AllowedCommand =
  | { kind: "npm-install"; packages?: string[]; flags?: string[] }
  | { kind: "npm-ci" }
  | { kind: "npm-run"; script: "dev" | "build" | "start" | "preview" }
  | { kind: "tsc-noemit" };

export interface RuntimeEvent {
  at: string;
  missionId: string;
  payload: Record<string, unknown>;
  sequence: number;
  sessionId: string;
  type:
    | "runtime.state"
    | "terminal.command"
    | "terminal.output"
    | "diagnostic.detected"
    | "correction.requested"
    | "correction.applied"
    | "correction.blocked"
    | "preview.ready";
}

export interface RuntimeSupportResult {
  reason?: string;
  supported: boolean;
  warning?: string;
}

export interface ProjectRuntimeAdapter {
  readonly capabilities: RuntimeCapabilities;

  /**
   * Initializes a dedicated session for a mission.
   * If an active session already exists (for this or another mission), it is torn down first.
   */
  createSession: (missionId: string) => Promise<RuntimeSession>;

  /** Tears down session, kills processes, wipes workspace directory and clears listeners */
  destroySession: () => Promise<void>;

  /** Executes an explicitly authorized command within the session */
  executeCommand: (
    cmd: AllowedCommand,
    opts?: {
      signal?: AbortSignal;
      onOutput?: (chunk: string) => void;
    }
  ) => Promise<{ exitCode: number; output: string }>;

  /** Returns current active session or null */
  getActiveSession: () => RuntimeSession | null;

  /** Returns active preview URL if available */
  getPreviewUrl: () => string | null;

  /** Inspects environment capabilities (browser support, cross-origin isolation, SharedArrayBuffer) */
  isSupported: () => RuntimeSupportResult;
  readonly kind: RuntimeKind;

  /** Mounts workspace files into the runtime directory */
  mountProject: (files: MissionWorkspaceFile[]) => Promise<void>;

  /** Starts the project development server and waits for readiness */
  startDevServer: (opts?: {
    onOutput?: (chunk: string) => void;
  }) => Promise<{ url: string }>;

  /** Stops any currently running background process (dev server or command) */
  stopProcess: () => void;

  /** Subscribes to runtime lifecycle and telemetry events */
  subscribe: (listener: (event: RuntimeEvent) => void) => () => void;

  /** Writes or updates a single file in the active session */
  writeFile: (path: string, content: string) => Promise<boolean>;
}
