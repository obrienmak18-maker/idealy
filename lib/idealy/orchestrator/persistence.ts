import type {
  OrchestratorTask,
  OrchestratorTaskResult,
  OrchestratorTaskStatus,
  OrchestratorTaskType,
} from "./types";
import { isOrchestratorTaskType } from "./types";

/**
 * Pure row ↔ task mapping for mission DAG persistence.
 *
 * Deliberately free of `server-only` and network access so the validation
 * rules are testable; the Supabase reads live in `service.ts`.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TASK_STATUSES: ReadonlySet<string> = new Set([
  "pending",
  "blocked",
  "ready",
  "running",
  "success",
  "failed",
  "retrying",
  "cancelled",
  "skipped",
]);

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isTaskStatus(value: unknown): value is OrchestratorTaskStatus {
  return typeof value === "string" && TASK_STATUSES.has(value);
}

export function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toIso(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** A persisted result is re-validated: a corrupt row must not fake a success. */
function toTaskResult(value: unknown): OrchestratorTaskResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const row = value as Record<string, unknown>;
  if (!isTaskStatus(row.status)) {
    return null;
  }
  const artifacts = Array.isArray(row.artifacts)
    ? row.artifacts.flatMap((entry) => {
        if (!entry || typeof entry !== "object") {
          return [];
        }
        const item = entry as Record<string, unknown>;
        return typeof item.kind === "string" && typeof item.ref === "string"
          ? [{ kind: item.kind, ref: item.ref }]
          : [];
      })
    : [];
  const usage =
    row.usage && typeof row.usage === "object"
      ? {
          powerCharged: toNumber(
            (row.usage as Record<string, unknown>).powerCharged
          ),
        }
      : null;
  return {
    artifacts,
    durationMs: toNumber(row.durationMs),
    executionId: typeof row.executionId === "string" ? row.executionId : "",
    metadata: toRecord(row.metadata),
    output: toRecord(row.output),
    status: row.status,
    usage,
  };
}

/**
 * Maps a persisted row into the scheduler's task shape.
 *
 * Unknown task types and statuses are rejected rather than coerced: a corrupt
 * row must not silently become a runnable task.
 */
export function rowToTask(
  row: Record<string, unknown>
): OrchestratorTask | null {
  const missionId = String(row.mission_id ?? "");
  const id = String(row.task_key ?? "");
  if (!(missionId && id) || !isOrchestratorTaskType(row.task_type)) {
    return null;
  }
  if (!isTaskStatus(row.status)) {
    return null;
  }
  const dependencies = Array.isArray(row.dependencies)
    ? row.dependencies.filter((d): d is string => typeof d === "string")
    : [];
  const name = typeof row.name === "string" ? row.name : id;
  return {
    agentId: String(row.agent_id ?? "idealy"),
    attemptKey: toIso(row.attempt_key),
    attempts: Number(row.attempts ?? 0),
    completedAt: toIso(row.completed_at),
    dependencies,
    description: name,
    error: typeof row.error === "string" ? row.error : null,
    failedAt: toIso(row.failed_at),
    id,
    inputs: toRecord(row.inputs),
    maxAttempts: Number(row.max_attempts ?? 3),
    metadata: toRecord(row.metadata),
    missionId,
    name,
    outputs: row.outputs === null ? null : toRecord(row.outputs),
    priority: Number(row.priority ?? 0),
    result: toTaskResult(row.result),
    startedAt: toIso(row.started_at),
    status: row.status,
    type: row.task_type as OrchestratorTaskType,
  };
}

/** Progress summary the UI renders without inventing any state. */
export function summarizeTasks(tasks: OrchestratorTask[]) {
  const byStatus: Record<string, number> = {};
  for (const task of tasks) {
    byStatus[task.status] = (byStatus[task.status] ?? 0) + 1;
  }
  const terminal = tasks.filter((t) =>
    ["success", "failed", "cancelled", "skipped"].includes(t.status)
  ).length;
  return {
    byStatus,
    completed: terminal,
    inFlight: tasks.filter((t) => t.status === "running").length,
    ready: tasks.filter((t) => t.status === "ready").length,
    total: tasks.length,
  };
}
