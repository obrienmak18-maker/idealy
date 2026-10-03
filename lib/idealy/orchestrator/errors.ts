/**
 * Task error classification + retry policy.
 * Local errors stop the task; only transient ones are retried.
 */
export type TaskFailureClass =
  | "timeout"
  | "rate_limit"
  | "network"
  | "permission"
  | "invalid_input"
  | "provider_failure"
  | "code_failure"
  | "logical_failure"
  | "resource_unavailable"
  | "configuration";

const TRANSIENT: ReadonlySet<TaskFailureClass> = new Set([
  "timeout",
  "rate_limit",
  "network",
  "provider_failure",
  "resource_unavailable",
]);

export class TaskExecutionError extends Error {
  readonly failureClass: TaskFailureClass;
  constructor(failureClass: TaskFailureClass, message: string) {
    super(message);
    this.name = "TaskExecutionError";
    this.failureClass = failureClass;
  }
}

export function classifyTaskFailure(error: unknown): TaskFailureClass {
  if (error instanceof TaskExecutionError) {
    return error.failureClass;
  }
  const msg = (
    error instanceof Error ? error.message : String(error ?? "")
  ).toLowerCase();
  if (msg.includes("permission") || msg.includes("denied")) {
    return "permission";
  }
  if (msg.includes("config")) {
    return "configuration";
  }
  if (msg.includes("invalid") || msg.includes("bad input")) {
    return "invalid_input";
  }
  if (msg.includes("resource") || msg.includes("unavailable")) {
    return "resource_unavailable";
  }
  if (msg.includes("timeout") || msg.includes("timed out")) {
    return "timeout";
  }
  if (msg.includes("429") || msg.includes("rate limit")) {
    return "rate_limit";
  }
  if (msg.includes("network") || msg.includes("fetch failed")) {
    return "network";
  }
  return "logical_failure";
}

export function isRetryableFailure(failure: TaskFailureClass): boolean {
  return TRANSIENT.has(failure);
}

/** True when the task still has attempts left for a retryable failure. */
export function shouldRetryTask(
  attempts: number,
  maxAttempts: number,
  failure: TaskFailureClass
): boolean {
  if (!isRetryableFailure(failure)) {
    return false;
  }
  return attempts < maxAttempts;
}
