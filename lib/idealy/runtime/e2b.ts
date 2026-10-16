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
