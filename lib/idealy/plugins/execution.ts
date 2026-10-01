import { authorizeToolExecution, type PermissionCheck } from "./permissions";
import type {
  PluginExecution,
  PluginExecutionStatus,
  PluginInstallation,
  PluginManifest,
  PluginPermission,
} from "./types";

// ─── Error classification ────────────────────────────────────────────────────

export type FailureClass =
  | "timeout"
  | "rate_limit"
  | "network"
  | "permission"
  | "invalid_input"
  | "provider_failure"
  | "code_failure"
  | "logical_failure";

/**
 * Only transient classes are retried. A permission error or a bad input will
 * fail identically on every attempt, so retrying it is pure waste.
 */
const RETRYABLE: Readonly<Record<FailureClass, boolean>> = {
  code_failure: false,
  invalid_input: false,
  logical_failure: false,
  network: true,
  permission: false,
  provider_failure: true,
  rate_limit: true,
  timeout: true,
};

export const MAX_ATTEMPTS = 3;

export class PluginExecutionError extends Error {
  readonly failureClass: FailureClass;
  readonly status: number | undefined;

  constructor(failureClass: FailureClass, message: string, status?: number) {
    super(message);
    this.failureClass = failureClass;
    this.name = "PluginExecutionError";
    this.status = status;
  }
}

export function classifyFailure(error: unknown): FailureClass {
  const raw = error instanceof Error ? error : null;
  const message = (raw?.message ?? String(error ?? "")).toLowerCase();
  const code = String(
    (error as { code?: unknown } | null)?.code ?? ""
  ).toLowerCase();

  if (raw instanceof PluginExecutionError) {
    return raw.failureClass;
  }
  if (
    code === "etimedout" ||
    message.includes("timed out") ||
    message.includes("timeout")
  ) {
    return "timeout";
  }
  if (
    code === "ratelimit" ||
    message.includes("rate limit") ||
    message.includes("429") ||
    message.includes("too many requests")
  ) {
    return "rate_limit";
  }
  if (
    code === "enotfound" ||
    code === "econnrefused" ||
    code === "enetwork" ||
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("socket")
  ) {
    return "network";
  }
  if (
    code === "unauthorized" ||
    code === "forbidden" ||
    message.includes("401") ||
    message.includes("403") ||
    message.includes("permission")
  ) {
    return "permission";
  }
  if (
    code === "invalid_input" ||
    message.includes("invalid") ||
    message.includes("validation")
  ) {
    return "invalid_input";
  }
  if (
    code.startsWith("5") ||
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503")
  ) {
    return "provider_failure";
  }
  return "logical_failure";
}

export type RetryDecision =
  | { retry: false; reason: string }
  | { retry: true; delayMs: number; attempt: number };

/**
 * Retry is justified per failure class, never infinite. The delay grows
 * exponentially and a rate limit additionally honours a provider hint.
 */
export function decideRetry({
  attempt,
  failureClass,
  retryAfterMs,
}: {
  attempt: number;
  failureClass: FailureClass;
  retryAfterMs?: number | null;
}): RetryDecision {
  if (!RETRYABLE[failureClass]) {
    return {
      reason: `Failure class "${failureClass}" is not retryable.`,
      retry: false,
    };
  }
  if (attempt >= MAX_ATTEMPTS) {
    return {
      reason: `Retry budget exhausted after ${attempt} attempt(s).`,
      retry: false,
    };
  }
  const backoff = 500 * 2 ** (attempt - 1);
  const delayMs =
    failureClass === "rate_limit" && retryAfterMs && retryAfterMs > backoff
      ? retryAfterMs
      : backoff;
  return { attempt: attempt + 1, delayMs, retry: true };
}
// ─── Execution record ────────────────────────────────────────────────────────

export function createExecutionRecord({
  actorUserId,
  id,
  input,
  missionId,
  pluginId,
  pluginVersion,
  taskId,
  toolId,
  workspaceId,
}: {
  actorUserId: string;
  id: string;
  input: unknown;
  missionId: string | null;
  pluginId: string;
  pluginVersion: string;
  taskId: string | null;
  toolId: string;
  workspaceId: string | null;
}): PluginExecution {
  return {
    actorUserId,
    attempts: 0,
    completedAt: null,
    durationMs: null,
    error: null,
    errorCode: null,
    id,
    input,
    missionId,
    output: null,
    pluginId,
    pluginVersion,
    startedAt: null,
    status: "pending",
    taskId,
    toolId,
    workspaceId,
  };
}

function durationBetween(start: string | null, end: string): number | null {
  if (!start) {
    return null;
  }
  const delta = Date.parse(end) - Date.parse(start);
  return Number.isFinite(delta) && delta >= 0 ? delta : null;
}

export function markRunning(
  execution: PluginExecution,
  startedAt: string
): PluginExecution {
  return {
    ...execution,
    attempts: execution.attempts + 1,
    startedAt,
    status: "running",
  };
}

export function markSucceeded(
  execution: PluginExecution,
  completedAt: string,
  output: unknown
): PluginExecution {
  return {
    ...execution,
    completedAt,
    durationMs: durationBetween(execution.startedAt, completedAt),
    error: null,
    errorCode: null,
    output,
    status: "succeeded",
  };
}

/** Failures are recorded, never erased: an audit trail must keep the error. */
export function markFailed(
  execution: PluginExecution,
  completedAt: string,
  error: unknown
): PluginExecution {
  return {
    ...execution,
    completedAt,
    durationMs: durationBetween(execution.startedAt, completedAt),
    error: error instanceof Error ? error.message : String(error),
    errorCode: classifyFailure(error),
    status: "failed",
  };
}

export function markDenied(
  execution: PluginExecution,
  check: Extract<PermissionCheck, { allowed: false }>
): PluginExecution {
  return {
    ...execution,
    completedAt: null,
    error: check.reason,
    errorCode: check.code,
    status: "denied",
  };
}

export type ExecutionAuditEvent = {
  type:
    | "execution_started"
    | "execution_succeeded"
    | "execution_failed"
    | "execution_denied";
  executionId: string;
  pluginId: string;
  toolId: string;
  missionId: string | null;
  taskId: string | null;
  workspaceId: string | null;
  actorUserId: string;
  status: PluginExecutionStatus;
  durationMs: number | null;
  errorCode: string | null;
};

/** The single entry point every caller must go through to reach a provider. */
export type ToolProvider = (input: unknown) => Promise<unknown>;

export type ExecutionOutcome =
  | { ok: true; execution: PluginExecution; output: unknown }
  | { ok: false; execution: PluginExecution };

export type ExecutionContext = {
  actorUserId: string;
  confirmed: boolean;
  grantedPermissions: readonly PluginPermission[];
  installedPluginIds: ReadonlySet<string>;
  installation: PluginInstallation | null;
  missionId: string | null;
  pluginId: string;
  pluginVersion: string;
  taskId: string | null;
  toolId: string;
  userPlan: "free" | "pro" | "business";
  workspaceId: string | null;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Executes a plugin tool under the full server-side gate.
 *
 * The provider is only reached after every permission, plan, dependency and
 * confirmation check has passed. A `success` is never fabricated: if the
 * provider throws, the failure is classified, recorded and returned as failed.
 *
 * The retry loop is intentionally sequential: attempts must not overlap, so a
 * rate-limited provider is never hit twice concurrently.
 */
export async function executePluginTool({
  context,
  executionId,
  input,
  manifest,
  now,
  provider,
}: {
  context: ExecutionContext;
  executionId: string;
  input: unknown;
  manifest: PluginManifest;
  now?: () => Date;
  provider: ToolProvider;
}): Promise<ExecutionOutcome> {
  const clock = now ?? (() => new Date());

  let execution = createExecutionRecord({
    actorUserId: context.actorUserId,
    id: executionId,
    input,
    missionId: context.missionId,
    pluginId: context.pluginId,
    pluginVersion: context.pluginVersion,
    taskId: context.taskId,
    toolId: context.toolId,
    workspaceId: context.workspaceId,
  });

  const check = authorizeToolExecution({
    confirmed: context.confirmed,
    grantedPermissions: context.grantedPermissions,
    installation: context.installation,
    installedPluginIds: context.installedPluginIds,
    manifest,
    toolId: context.toolId,
    userPlan: context.userPlan,
  });

  if (!check.allowed) {
    return { execution: markDenied(execution, check), ok: false };
  }

  while (true) {
    execution = markRunning(execution, clock().toISOString());
    try {
      // biome-ignore lint/performance/noAwaitInLoops: retries must not overlap by design
      const output = await provider(input);
      return {
        execution: markSucceeded(execution, clock().toISOString(), output),
        ok: true,
        output,
      };
    } catch (error) {
      execution = markFailed(execution, clock().toISOString(), error);
      const decision = decideRetry({
        attempt: execution.attempts,
        failureClass: classifyFailure(error),
      });
      if (!decision.retry) {
        return { execution, ok: false };
      }
      await sleep(decision.delayMs);
    }
  }
}
