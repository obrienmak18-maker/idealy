/**
 * Mission DAG scheduler — pure, testable, bounded parallelism.
 */
import { classifyTaskFailure, shouldRetryTask } from "./errors";
import { createOrchestrationEvent, type OrchestrationEvent } from "./events";
import { resolveReadyTasks } from "./graph";
import {
  assertTaskStatusTransition,
  type MissionStatus,
  type OrchestratorTask,
} from "./types";

export type TaskExecutor = (input: {
  task: OrchestratorTask;
  attempt: number;
  attemptKey: string;
}) => Promise<{
  output: Record<string, unknown>;
  artifacts?: Array<{ kind: string; ref: string }>;
  powerCharged?: number;
}>;

export type SchedulerOptions = {
  maxConcurrentTasks?: number;
  now?: () => string;
  onEvent?: (event: OrchestrationEvent) => void;
  executionId?: string;
};

const DEFAULT_MAX_CONCURRENT = 3;

export type SchedulerResult = {
  tasks: OrchestratorTask[];
  events: OrchestrationEvent[];
  missionStatus: MissionStatus;
};

function cloneTasks(tasks: OrchestratorTask[]): OrchestratorTask[] {
  return tasks.map((t) => ({
    ...t,
    dependencies: [...t.dependencies],
    inputs: { ...t.inputs },
    metadata: { ...t.metadata },
    outputs: t.outputs === null ? null : { ...t.outputs },
    result: t.result === null ? null : { ...t.result },
  }));
}

function deriveMissionStatus(tasks: OrchestratorTask[]): MissionStatus {
  if (tasks.every((t) => t.status === "success")) {
    return "completed";
  }
  if (tasks.some((t) => t.status === "running")) {
    return "running";
  }
  if (tasks.some((t) => t.status === "failed")) {
    return "failed";
  }
  const done = new Set(["success", "skipped", "cancelled"]);
  if (tasks.every((t) => done.has(t.status))) {
    return "completed";
  }
  return "running";
}

function setStatus(
  task: OrchestratorTask,
  to: OrchestratorTask["status"]
): void {
  assertTaskStatusTransition(task.status, to);
  task.status = to;
}

export async function runTaskAttempt(input: {
  task: OrchestratorTask;
  executor: TaskExecutor;
  executionId: string;
  missionId: string;
  now?: () => string;
  onEvent?: (event: OrchestrationEvent) => void;
}): Promise<void> {
  const { task, executor, executionId, missionId } = input;
  if (task.status === "success" || task.status === "cancelled") {
    return;
  }
  if (task.status === "skipped" || task.attempts >= task.maxAttempts) {
    return;
  }
  const now = input.now ?? (() => new Date().toISOString());
  const { onEvent } = input;
  const attempt = task.attempts + 1;
  const attemptKey = `${executionId}:${task.id}:${attempt}`;
  if (task.status === "running" && task.attemptKey === attemptKey) {
    return;
  }
  task.attempts = attempt;
  task.attemptKey = attemptKey;
  if (task.status === "pending" || task.status === "blocked") {
    setStatus(task, "ready");
  }
  if (task.status === "retrying") {
    setStatus(task, "ready");
  }
  setStatus(task, "running");
  task.startedAt = task.startedAt ?? now();
  task.error = null;
  onEvent?.(
    createOrchestrationEvent({
      attempt,
      message: `Task ${task.id} started (attempt ${attempt}).`,
      missionId,
      status: "running",
      taskId: task.id,
      type: "task_started",
    })
  );
  const startedMs = Date.now();
  try {
    const produced = await executor({ attempt, attemptKey, task });
    task.outputs = produced.output;
    task.result = {
      artifacts: produced.artifacts ?? [],
      durationMs: Date.now() - startedMs,
      executionId,
      metadata: {},
      output: produced.output,
      status: "success",
      usage:
        produced.powerCharged === undefined
          ? null
          : { powerCharged: produced.powerCharged },
    };
    task.completedAt = now();
    task.failedAt = null;
    setStatus(task, "success");
    onEvent?.(
      createOrchestrationEvent({
        attempt,
        message: `Task ${task.id} succeeded.`,
        missionId,
        status: "success",
        taskId: task.id,
        type: "task_succeeded",
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    task.failedAt = now();
    task.error = message;
    const failure = classifyTaskFailure(error);
    if (shouldRetryTask(task.attempts, task.maxAttempts, failure)) {
      setStatus(task, "failed");
      setStatus(task, "retrying");
      setStatus(task, "ready");
      onEvent?.(
        createOrchestrationEvent({
          attempt,
          message: `Task ${task.id} failed (${failure}), retrying.`,
          missionId,
          payload: { failure, message },
          status: "retrying",
          taskId: task.id,
          type: "task_retrying",
        })
      );
    } else {
      setStatus(task, "failed");
      onEvent?.(
        createOrchestrationEvent({
          attempt,
          message: `Task ${task.id} failed (${failure}): ${message}`,
          missionId,
          payload: { failure, message },
          status: "failed",
          taskId: task.id,
          type: "task_failed",
        })
      );
    }
  }
}

export type RunMissionInput = {
  missionId: string;
  tasks: OrchestratorTask[];
  executor: TaskExecutor;
  options?: SchedulerOptions;
  signal?: { cancelled: boolean };
};

export type ResumeMissionInput = {
  missionId: string;
  tasks: OrchestratorTask[];
  executor: TaskExecutor;
  options?: SchedulerOptions;
  signal?: { cancelled: boolean };
};

/** Resume a partially-executed mission from persisted task state. */
export function resumeMissionGraph(
  input: ResumeMissionInput
): Promise<SchedulerResult> {
  const tasks = input.tasks.map((t) =>
    t.status === "running"
      ? { ...t, attemptKey: null, status: "ready" as const }
      : t
  );
  return runMissionGraph({ ...input, tasks });
}

function pushEvents(
  collected: OrchestrationEvent[]
): (event: OrchestrationEvent) => void {
  return (event) => {
    collected.push(event);
  };
}

function fanOut(
  collected: OrchestrationEvent[],
  external: SchedulerOptions["onEvent"]
): (event: OrchestrationEvent) => void {
  const push = pushEvents(collected);
  return (event) => {
    push(event);
    external?.(event);
  };
}

/**
 * Run the mission graph to completion.
 * Independent READY tasks execute concurrently via Promise.all on bounded
 * batches — never `await B(); await C(); await D()` for independent work.
 * Cancel and resume are driven by persisted task state, never by the UI.
 */
export async function runMissionGraph(
  input: RunMissionInput
): Promise<SchedulerResult> {
  const maxConcurrent =
    input.options?.maxConcurrentTasks ?? DEFAULT_MAX_CONCURRENT;
  if (!Number.isInteger(maxConcurrent) || maxConcurrent < 1) {
    throw new Error(`Invalid maxConcurrentTasks: ${maxConcurrent}`);
  }
  const now = input.options?.now ?? (() => new Date().toISOString());
  const onEvent = input.options?.onEvent;
  const executionId =
    input.options?.executionId ?? `exec-${Date.now().toString(36)}`;
  const tasks = cloneTasks(input.tasks);
  const events: OrchestrationEvent[] = [];
  const notify = fanOut(events, onEvent);
  notify(
    createOrchestrationEvent({
      message: "Mission started.",
      missionId: input.missionId,
      status: "running",
      type: "mission_started",
    })
  );

  let guard = 0;
  const MAX_ROUNDS = 10_000;
  for (;;) {
    guard += 1;
    if (guard > MAX_ROUNDS) {
      throw new Error("Scheduler exceeded maximum rounds — possible livelock.");
    }
    if (input.signal?.cancelled) {
      for (const task of tasks) {
        if (task.status === "pending" || task.status === "blocked") {
          setStatus(task, "cancelled");
        }
        if (task.status === "ready" || task.status === "retrying") {
          setStatus(task, "cancelled");
        }
      }
      notify(
        createOrchestrationEvent({
          message: "Mission cancelled.",
          missionId: input.missionId,
          status: "cancelled",
          type: "mission_cancelled",
        })
      );
      break;
    }
    const ready = resolveReadyTasks(tasks).slice(0, maxConcurrent);
    if (ready.length === 0) {
      break;
    }
    ready.sort((a, b) => b.priority - a.priority);
    // biome-ignore lint/performance/noAwaitInLoops: bounded batch per round
    await Promise.all(
      ready.map(async (snapshot) => {
        const live = tasks.find((t) => t.id === snapshot.id);
        if (live === undefined) {
          return;
        }
        await runTaskAttempt({
          executionId,
          executor: input.executor,
          missionId: input.missionId,
          now,
          onEvent: notify,
          task: live,
        });
      })
    );
  }

  const missionStatus = deriveMissionStatus(tasks);
  notify(
    createOrchestrationEvent({
      message:
        missionStatus === "completed"
          ? "Mission completed."
          : `Mission ended with status ${missionStatus}.`,
      missionId: input.missionId,
      status: missionStatus,
      type:
        missionStatus === "completed" ? "mission_completed" : "mission_failed",
    })
  );
  return { events, missionStatus, tasks };
}
