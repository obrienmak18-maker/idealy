import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type AllowedCommand,
  getRuntimeAdapter,
  isAllowedWorkspacePath,
  sanitizeWorkspacePath,
  UnsupportedAdapter,
  validateAllowedCommand,
  WebcontainerAdapter,
} from "../index";

describe("Runtime Security & Path Filtering", () => {
  it("authorizes standard safe project paths", () => {
    expect(isAllowedWorkspacePath("src/App.tsx").allowed).toBe(true);
    expect(isAllowedWorkspacePath("package.json").allowed).toBe(true);
    expect(isAllowedWorkspacePath("index.html").allowed).toBe(true);
    expect(isAllowedWorkspacePath("public/assets/logo.svg").allowed).toBe(true);
    expect(isAllowedWorkspacePath(".env.example").allowed).toBe(true);
  });

  it("strictly denies sensitive files and environment secrets", () => {
    expect(isAllowedWorkspacePath(".env").allowed).toBe(false);
    expect(isAllowedWorkspacePath(".env.local").allowed).toBe(false);
    expect(isAllowedWorkspacePath(".env.production").allowed).toBe(false);
    expect(isAllowedWorkspacePath(".npmrc").allowed).toBe(false);
    expect(isAllowedWorkspacePath("server.pem").allowed).toBe(false);
    expect(isAllowedWorkspacePath("private.key").allowed).toBe(false);
    expect(isAllowedWorkspacePath("id_rsa").allowed).toBe(false);
    expect(isAllowedWorkspacePath("id_rsa.pub").allowed).toBe(false);
    expect(isAllowedWorkspacePath("cert.p12").allowed).toBe(false);
  });

  it("rejects path traversal attempts and control characters", () => {
    expect(isAllowedWorkspacePath("../secrets.txt").allowed).toBe(false);
    expect(isAllowedWorkspacePath("src/../../package.json").allowed).toBe(
      false
    );
    expect(isAllowedWorkspacePath("file\0.ts").allowed).toBe(false);
    expect(isAllowedWorkspacePath("").allowed).toBe(false);
  });

  it("sanitizes valid paths into workspace/ root and throws on sensitive files", () => {
    expect(sanitizeWorkspacePath("src/main.tsx")).toBe(
      "workspace/src/main.tsx"
    );
    expect(() => sanitizeWorkspacePath(".env")).toThrowError(/refusé/i);
    expect(() => sanitizeWorkspacePath("../etc/passwd")).toThrowError(
      /traversée/i
    );
  });
});

describe("Command Validation & Security", () => {
  it("authorizes safe npm-install commands", () => {
    const emptyInstall: AllowedCommand = { kind: "npm-install" };
    const res1 = validateAllowedCommand(emptyInstall);
    expect(res1.valid).toBe(true);
    expect(res1.binary).toBe("npm");
    expect(res1.args).toEqual(["install", "--ignore-scripts"]);

    const pkgInstall: AllowedCommand = {
      kind: "npm-install",
      packages: ["react", "@types/node", "lucide-react@^0.553.0"],
    };
    const res2 = validateAllowedCommand(pkgInstall);
    expect(res2.valid).toBe(true);
    expect(res2.args).toEqual([
      "install",
      "--ignore-scripts",
      "react",
      "@types/node",
      "lucide-react@^0.553.0",
    ]);
  });

  it("rejects npm-install with shell injections or invalid package specifiers", () => {
    const malicious1: AllowedCommand = {
      kind: "npm-install",
      packages: ["react; rm -rf /"],
    };
    expect(validateAllowedCommand(malicious1).valid).toBe(false);

    const malicious2: AllowedCommand = {
      kind: "npm-install",
      packages: ["https://malicious.org/payload.tgz"],
    };
    expect(validateAllowedCommand(malicious2).valid).toBe(false);
  });

  it("authorizes npm-ci with --ignore-scripts", () => {
    const cmd: AllowedCommand = { kind: "npm-ci" };
    const res = validateAllowedCommand(cmd);
    expect(res.valid).toBe(true);
    expect(res.binary).toBe("npm");
    expect(res.args).toEqual(["ci", "--ignore-scripts"]);
  });

  it("authorizes allowed scripts and rejects arbitrary npm run scripts", () => {
    const devCmd: AllowedCommand = { kind: "npm-run", script: "dev" };
    expect(validateAllowedCommand(devCmd).valid).toBe(true);

    const buildCmd: AllowedCommand = { kind: "npm-run", script: "build" };
    expect(validateAllowedCommand(buildCmd).valid).toBe(true);

    const arbitraryCmd = {
      kind: "npm-run",
      script: "arbitrary-script",
    } as unknown as AllowedCommand;
    expect(validateAllowedCommand(arbitraryCmd).valid).toBe(false);
  });

  it("authorizes tsc-noemit", () => {
    const cmd: AllowedCommand = { kind: "tsc-noemit" };
    const res = validateAllowedCommand(cmd);
    expect(res.valid).toBe(true);
    expect(res.binary).toBe("npx");
    expect(res.args).toEqual(["tsc", "--noEmit"]);
  });
});

describe("WebcontainerAdapter Support & Capabilities", () => {
  const originalWindow = globalThis.window;
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    // Default mock: Chromium Desktop with crossOriginIsolated & SharedArrayBuffer
    vi.stubGlobal("window", {
      clearTimeout: globalThis.clearTimeout,
      crossOriginIsolated: true,
      setTimeout: globalThis.setTimeout,
    });
    vi.stubGlobal("SharedArrayBuffer", ArrayBuffer);
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
    });
  });

  afterEach(() => {
    vi.stubGlobal("window", originalWindow);
    vi.stubGlobal("navigator", originalNavigator);
  });

  it("reports supported in Chromium desktop with crossOriginIsolated", () => {
    const adapter = new WebcontainerAdapter();
    const support = adapter.isSupported();
    expect(support.supported).toBe(true);
    expect(adapter.capabilities.interactivePreview).toBe(true);
    expect(adapter.capabilities.fileHotReload).toBe(true);
    expect(adapter.capabilities.isolationLevel).toBe("browser-wasm");
  });

  it("reports unsupported when crossOriginIsolated is false", () => {
    vi.stubGlobal("window", { crossOriginIsolated: false });
    const adapter = new WebcontainerAdapter();
    const support = adapter.isSupported();
    expect(support.supported).toBe(false);
    expect(support.reason).toMatch(/crossOriginIsolated/i);
  });

  it("reports unsupported on Safari due to missing COEP credentialless support", () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    });
    const adapter = new WebcontainerAdapter();
    const support = adapter.isSupported();
    expect(support.supported).toBe(false);
    expect(support.reason).toMatch(/Safari/i);
  });

  it("reports unsupported on mobile browsers", () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
    });
    const adapter = new WebcontainerAdapter();
    const support = adapter.isSupported();
    expect(support.supported).toBe(false);
    expect(support.reason).toMatch(/mobile/i);
  });

  it("reports unsupported with beta warning on Firefox", () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
    });
    const adapter = new WebcontainerAdapter();
    const support = adapter.isSupported();
    expect(support.supported).toBe(false);
    expect(support.reason).toMatch(/Firefox/i);
  });
});

describe("Session Isolation & Teardown", () => {
  it("creates a session with a unique UUID and initializes state to idle", async () => {
    const adapter = new WebcontainerAdapter();
    const session1 = await adapter.createSession("mission-123");
    expect(session1.missionId).toBe("mission-123");
    expect(session1.sessionId).toBeTruthy();
    expect(session1.state).toBe("idle");
    expect(adapter.getActiveSession()).toBe(session1);
  });

  it("isolates sessions: creating a new session destroys the previous one", async () => {
    const adapter = new WebcontainerAdapter();
    const sessionA = await adapter.createSession("mission-A");
    const sessionIdA = sessionA.sessionId;

    const sessionB = await adapter.createSession("mission-B");
    expect(sessionB.sessionId).not.toBe(sessionIdA);
    expect(sessionB.missionId).toBe("mission-B");
    expect(adapter.getActiveSession()?.sessionId).toBe(sessionB.sessionId);
  });

  it("emits sequential runtime events to subscribers", async () => {
    const adapter = new WebcontainerAdapter();
    const events: string[] = [];
    adapter.subscribe((e) => {
      events.push(`${e.type}:${e.sequence}`);
    });

    await adapter.createSession("mission-events");
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toBe("runtime.state:1");
  });

  it("UnsupportedAdapter returns safe fallback state and throws on execution", async () => {
    const adapter = new UnsupportedAdapter("Navigateur non compatible");
    expect(adapter.isSupported().supported).toBe(false);
    expect(adapter.capabilities.interactivePreview).toBe(false);

    const session = await adapter.createSession("mission-fallback");
    expect(session.state).toBe("unsupported");

    await expect(adapter.mountProject([])).rejects.toThrow(/non supporté/i);
    await expect(adapter.executeCommand({ kind: "npm-ci" })).rejects.toThrow(
      /impossible/i
    );
    await expect(adapter.startDevServer()).rejects.toThrow(/indisponible/i);
  });

  it("getRuntimeAdapter returns UnsupportedAdapter when environment is invalid", () => {
    vi.stubGlobal("window", { crossOriginIsolated: false });
    const adapter = getRuntimeAdapter("webcontainer");
    expect(adapter.kind).toBe("unsupported");
    expect(adapter.isSupported().supported).toBe(false);
  });
});
