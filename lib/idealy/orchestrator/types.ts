/**
 * Idealy Mission DAG — task model + state machines.
 *
 * A mission is a DAG of tasks. The scheduler decides WHICH task runs;
 * the agent decides HOW. This module stays pure (no I/O) so the
 * scheduler, persistence adapters and Edge Function can share it.
 */

export const ORCHESTRATOR_TASK_TYPES = [
  "analyze",
  "architect",
  "design",
  "research",
  "asset_plan",
  "build",
  "run",
  "review",
  "fix",
  "verify",
  "deploy",
] as const;

export type OrchestratorTaskType = (typeof ORCHESTRATOR_TASK_TYPES)[number];

export function isOrchestratorTaskType(
  value: unknown
): value is OrchestratorTaskType {
  return (
    typeof value === "string" &&
    (ORCHESTRATOR_TASK_TYPES as readonly string[]).includes(value)
  );
}

export const ORCHESTRATOR_TASK_STATUSES = [
  "pending",
  "blocked",
  "ready",
  "running",
  "success",
  "failed",
  "retrying",
  "cancelled",
  "skipped",
] as const;

export type OrchestratorTaskStatus =
  (typeof ORCHESTRATOR_TASK_STATUSES)[number];

const TASK_TRANSITIONS: Readonly<
  Record<OrchestratorTaskStatus, readonly OrchestratorTaskStatus[]>
> = {
  blocked: ["ready", "cancelled", "skipped"],
  cancelled: [],
  failed: ["retrying", "cancelled"],
  pending: ["ready", "blocked", "cancelled", "skipped"],
  ready: ["running", "cancelled", "skipped"],
  retrying: ["ready", "cancelled"],
  running: ["success", "failed", "cancelled", "skipped"],
  skipped: [],
  success: [],
};

export function canTransitionTaskStatus(
  from: OrchestratorTaskStatus,
  to: OrchestratorTaskStatus
): boolean {
  return TASK_TRANSITIONS[from].includes(to);
}

export function assertTaskStatusTransition(
  from: OrchestratorTaskStatus,
  to: OrchestratorTaskStatus
): void {
  if (!canTransitionTaskStatus(from, to)) {
    throw new Error(`Illegal task status transition: ${from} -> ${to}`);
  }
}

export const TERMINAL_TASK_STATUSES: ReadonlySet<OrchestratorTaskStatus> =
  new Set(["success", "failed", "cancelled", "skipped"]);

export type OrchestratorTask = {
  id: string;
  missionId: string;
  type: OrchestratorTaskType;
  name: string;
  description?: string;
  agentId: string;
  status: OrchestratorTaskStatus;
  dependencies: string[];
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown> | null;
  attempts: number;
  maxAttempts: number;
  priority: number;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  error: string | null;
  attemptKey: string | null;
  result: OrchestratorTaskResult | null;
  metadata: Record<string, unknown>;
};

export type OrchestratorTaskResult = {
  status: OrchestratorTaskStatus;
  output: Record<string, unknown>;
  artifacts: Array<{ kind: string; ref: string }>;
  executionId: string;
  durationMs: number;
  usage: { powerCharged: number } | null;
  metadata: Record<string, unknown>;
};

export type NewOrchestratorTask = {
  id: string;
  type: OrchestratorTaskType;
  name?: string;
  description?: string;
  agentId: string;
  dependencies?: string[];
  inputs?: Record<string, unknown>;
  maxAttempts?: number;
  priority?: number;
  metadata?: Record<string, unknown>;
};

const TASK_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export function createOrchestratorTask(
  missionId: string,
  input: NewOrchestratorTask
): OrchestratorTask {
  if (!TASK_ID_PATTERN.test(input.id)) {
    throw new Error(`Invalid task id: ${input.id}`);
  }
  if (!isOrchestratorTaskType(input.type)) {
    throw new Error(`Unknown task type: ${String(input.type)}`);
  }
  const dependencies = [...new Set(input.dependencies ?? [])];
  const maxAttempts = input.maxAttempts ?? 3;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
    throw new Error(`Invalid maxAttempts for task ${input.id}: ${maxAttempts}`);
  }
  return {
    agentId: input.agentId,
    attemptKey: null,
    attempts: 0,
    completedAt: null,
    dependencies,
    description: input.description,
    error: null,
    failedAt: null,
    id: input.id,
    inputs: input.inputs ?? {},
    maxAttempts,
    metadata: input.metadata ?? {},
    missionId,
    name: input.name ?? input.id,
    outputs: null,
    priority: input.priority ?? 0,
    result: null,
    startedAt: null,
    status: dependencies.length > 0 ? "blocked" : "pending",
    type: input.type,
  };
}

export const MISSION_STATUSES = [
  "draft",
  "planned",
  "running",
  "waiting",
  "verifying",
  "completed",
  "failed",
  "cancelled",
  "blocked",
] as const;

export type MissionStatus = (typeof MISSION_STATUSES)[number];

const MISSION_TRANSITIONS: Readonly<
  Record<MissionStatus, readonly MissionStatus[]>
> = {
  blocked: ["running", "cancelled", "failed"],
  cancelled: [],
  completed: [],
  draft: ["planned", "cancelled"],
  failed: ["running", "cancelled"],
  planned: ["running", "cancelled"],
  running: [
    "waiting",
    "verifying",
    "completed",
    "failed",
    "cancelled",
    "blocked",
  ],
  verifying: ["completed", "failed", "running", "cancelled"],
  waiting: ["running", "cancelled", "failed", "blocked"],
};

export function canTransitionMissionStatus(
  from: MissionStatus,
  to: MissionStatus
): boolean {
  return MISSION_TRANSITIONS[from].includes(to);
}

export function assertMissionStatusTransition(
  from: MissionStatus,
  to: MissionStatus
): void {
  if (!canTransitionMissionStatus(from, to)) {
    throw new Error(`Illegal mission status transition: ${from} -> ${to}`);
  }
}
