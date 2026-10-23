import "server-only";

export type SandboxExecutionResult = {
  success: boolean;
  language: "python" | "javascript" | "bash";
  stdout: string;
  stderr: string;
  results?: Array<{ text?: string; html?: string; png?: string }>;
  error?: string;
  executionTimeMs: number;
};

export function isE2BConfigured(): boolean {
  return Boolean(process.env.E2B_API_KEY?.trim());
}

export async function runCodeInSandbox(params: {
  code: string;
  language?: "python" | "javascript";
  timeoutMs?: number;
}): Promise<SandboxExecutionResult> {
  const startTime = Date.now();
  const apiKey = process.env.E2B_API_KEY?.trim();

  if (!apiKey) {
    return {
      success: false,
      language: params.language || "python",
      stdout: "",
      stderr: "E2B_API_KEY is not configured.",
      error: "E2B_API_KEY_MISSING",
      executionTimeMs: 0,
    };
  }

  const timeoutMs = Math.min(params.timeoutMs ?? 30_000, 60_000);
  let sbx: any = null;

  try {
    const { Sandbox } = await import("@e2b/code-interpreter");
    sbx = await Sandbox.create({
      apiKey,
      timeoutMs,
    });

    const execution = await sbx.runCode(params.code, {
      language: params.language === "javascript" ? "javascript" : "python",
    });

    const stdout = (execution.logs?.stdout || []).join("");
    const stderr = (execution.logs?.stderr || []).join("");
    const error = execution.error
      ? `${execution.error.name}: ${execution.error.value}\n${execution.error.traceback}`
      : undefined;

    return {
      success: !execution.error,
      language: params.language || "python",
      stdout,
      stderr,
      results: (execution.results || []).map((r: any) => ({
        text: r.text,
        html: r.html,
        png: r.png,
      })),
      error,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (err: any) {
    return {
      success: false,
      language: params.language || "python",
      stdout: "",
      stderr: err?.message || String(err),
      error: err?.message || "SANDBOX_EXECUTION_FAILED",
      executionTimeMs: Date.now() - startTime,
    };
  } finally {
    if (sbx) {
      try {
        await sbx.kill();
      } catch {
        // ignore sandbox kill errors in cleanup
      }
    }
  }
}

export async function runBashInSandbox(params: {
  command: string;
  timeoutMs?: number;
}): Promise<SandboxExecutionResult> {
  const startTime = Date.now();
  const apiKey = process.env.E2B_API_KEY?.trim();

  if (!apiKey) {
    return {
      success: false,
      language: "bash",
      stdout: "",
      stderr: "E2B_API_KEY is not configured.",
      error: "E2B_API_KEY_MISSING",
      executionTimeMs: 0,
    };
  }

  const timeoutMs = Math.min(params.timeoutMs ?? 30_000, 60_000);
  let sbx: any = null;

  try {
    const { Sandbox } = await import("@e2b/code-interpreter");
    sbx = await Sandbox.create({
      apiKey,
      timeoutMs,
    });

    const result = await sbx.commands.run(params.command);

    return {
      success: result.exitCode === 0,
      language: "bash",
      stdout: result.stdout || "",
      stderr: result.stderr || "",
      error:
        result.exitCode !== 0
          ? `Process exited with code ${result.exitCode}`
          : undefined,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (err: any) {
    return {
      success: false,
      language: "bash",
      stdout: "",
      stderr: err?.message || String(err),
      error: err?.message || "BASH_EXECUTION_FAILED",
      executionTimeMs: Date.now() - startTime,
    };
  } finally {
    if (sbx) {
      try {
        await sbx.kill();
      } catch {
        // ignore sandbox kill errors in cleanup
      }
    }
  }
}


export type WorkspaceBuildFile = {
  path: string;
  content: string;
};

export type WorkspaceBuildResult = {
  durationMs: number;
  error?: string;
  stderr: string;
  status: "passed" | "failed" | "not-configured";
  stdout: string;
};

const MAX_BUILD_FILES = 250;
const MAX_BUILD_FILE_BYTES = 300_000;
const MAX_BUILD_TOTAL_BYTES = 3_000_000;

function clippedBuildOutput(value: unknown, max = 12_000): string {
  if (typeof value !== "string") return "";
  return value.length > max ? value.slice(-max) : value;
}

/**
 * Runs the generated project's real package build in an isolated E2B sandbox.
 * A generated iframe preview is not considered a substitute for this result.
 */
export async function runWorkspaceBuildInSandbox(
  inputFiles: WorkspaceBuildFile[],
): Promise<WorkspaceBuildResult> {
  const startedAt = Date.now();
  const apiKey = process.env.E2B_API_KEY?.trim();
  const result = (
    status: WorkspaceBuildResult["status"],
    values: Partial<WorkspaceBuildResult> = {},
  ): WorkspaceBuildResult => ({
    durationMs: Date.now() - startedAt,
    error: values.error,
    stderr: values.stderr ?? "",
    status,
    stdout: values.stdout ?? "",
  });

  if (!apiKey) {
    return result("not-configured", {
      error: "E2B_API_KEY is not configured for this deployment.",
    });
  }

  if (!Array.isArray(inputFiles) || inputFiles.length === 0 || inputFiles.length > MAX_BUILD_FILES) {
    return result("failed", {
      error: "The workspace must contain between 1 and 250 saved files to build.",
    });
  }

  const files: WorkspaceBuildFile[] = [];
  const paths = new Set<string>();
  let totalBytes = 0;

  for (const file of inputFiles) {
    if (!file || typeof file.path !== "string" || typeof file.content !== "string") {
      return result("failed", { error: "A workspace file has an invalid shape." });
    }

    const path = file.path.replaceAll("\\", "/").trim();
    const segments = path.split("/");
    if (
      !path ||
      path.startsWith("/") ||
      path.length > 240 ||
      path.includes("\0") ||
      segments.some((segment) => !segment || segment === "." || segment === "..") ||
      /^[A-Za-z]:/.test(path)
    ) {
      return result("failed", { error: "A workspace file has an unsafe path." });
    }
    if (paths.has(path)) {
      return result("failed", { error: "The workspace contains duplicate file paths." });
    }
    paths.add(path);

    const bytes = new TextEncoder().encode(file.content).byteLength;
    if (bytes > MAX_BUILD_FILE_BYTES) {
      return result("failed", { error: "A workspace file exceeds the 300 KB build limit." });
    }
    totalBytes += bytes;
    if (totalBytes > MAX_BUILD_TOTAL_BYTES) {
      return result("failed", { error: "The workspace exceeds the 3 MB build input limit." });
    }
    files.push({ path, content: file.content });
  }

  const packageFile = files.find((file) => file.path === "package.json");
  if (!packageFile) {
    return result("failed", { error: "The workspace is missing its root package.json." });
  }

  let packageJson: unknown;
  try {
    packageJson = JSON.parse(packageFile.content);
  } catch {
    return result("failed", { error: "The generated package.json is not valid JSON." });
  }

  const buildScript =
    packageJson &&
    typeof packageJson === "object" &&
    "scripts" in packageJson &&
    packageJson.scripts &&
    typeof packageJson.scripts === "object" &&
    "build" in packageJson.scripts
      ? packageJson.scripts.build
      : null;
  if (typeof buildScript !== "string" || !buildScript.trim()) {
    return result("failed", {
      error: "The generated package.json must define a non-empty scripts.build command.",
    });
  }

  let sandbox: any = null;
  try {
    const { Sandbox } = await import("@e2b/code-interpreter");
    sandbox = await Sandbox.create({
      apiKey,
      timeoutMs: 240_000,
    });

    const workdir = "/tmp/idealy-build";
    await sandbox.files.writeFiles(
      files.map((file) => ({
        path: workdir + "/" + file.path,
        data: file.content,
      })),
      { requestTimeoutMs: 45_000 },
    );

    const command = [
      "set -eu",
      "cd " + workdir,
      "node --version",
      "npm --version",
      "npm install --ignore-scripts --no-audit --no-fund --no-package-lock",
      "npm run build",
    ].join("\n");
    const execution = await sandbox.commands.run(command, {
      cwd: workdir,
      requestTimeoutMs: 160_000,
      timeoutMs: 150_000,
    });
    const stdout = clippedBuildOutput(execution.stdout);
    const stderr = clippedBuildOutput(execution.stderr);
    const success = execution.exitCode === 0;

    return result(success ? "passed" : "failed", {
      error: success ? undefined : "The generated project's npm build command failed.",
      stderr,
      stdout,
    });
  } catch (error: unknown) {
    return result("failed", {
      error: error instanceof Error ? error.message : "Workspace build execution failed.",
    });
  } finally {
    if (sandbox) {
      try {
        await sandbox.kill();
      } catch {
        // The execution result should not be overwritten by cleanup errors.
      }
    }
  }
}
