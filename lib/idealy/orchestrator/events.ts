/**
 * Orchestration events — the future source of truth for the live timeline.
 * Every entry maps to a real state change, never to a frontend animation.
 */
import type { MissionStatus, OrchestratorTaskStatus } from "./types";

export const ORCHESTRATION_EVENT_TYPES = [
  "mission_created",
  "mission_started",
  "mission_paused",
  "mission_resumed",
  "mission_cancelled",
  "mission_completed",
  "mission_failed",
  "task_created",
  "task_ready",
  "task_started",
  "task_progress",
  "task_succeeded",
  "task_failed",
  "task_retrying",
  "task_blocked",
  "task_skipped",
  "task_cancelled",
  "agent_started",
  "agent_completed",
  "tool_started",
  "tool_completed",
  "power_reserved",
  "power_settled",
] as const;

export type OrchestrationEventType = (typeof ORCHESTRATION_EVENT_TYPES)[number];

export type OrchestrationEvent = {
  id: string;
  missionId: string;
  type: OrchestrationEventType;
  taskId: string | null;
  attempt: number | null;
  status: OrchestratorTaskStatus | MissionStatus | null;
  message: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

let eventCounter = 0;

export function createOrchestrationEvent(input: {
  missionId: string;
  type: OrchestrationEventType;
  taskId?: string;
  attempt?: number;
  status?: OrchestratorTaskStatus | MissionStatus;
  message: string;
  payload?: Record<string, unknown>;
}): OrchestrationEvent {
  eventCounter += 1;
  return {
    attempt: input.attempt ?? null,
    createdAt: new Date().toISOString(),
    id: `evt-${Date.now().toString(36)}-${eventCounter}`,
    message: input.message,
    missionId: input.missionId,
    payload: input.payload ?? {},
    status: input.status ?? null,
    taskId: input.taskId ?? null,
    type: input.type,
  };
}

/** Rebuild a human-readable timeline from persisted events. */
export function buildTimelineFromEvents(
  events: OrchestrationEvent[]
): Array<{ at: string; text: string; taskId: string | null }> {
  return [...events]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((e) => ({ at: e.createdAt, taskId: e.taskId, text: e.message }));
}
