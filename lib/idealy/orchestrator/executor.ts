/**
 * Task executor bridge.
 *
 * The scheduler decides WHICH task runs; this module decides how a task reaches
 * the existing Plugin Engine and Power system. Both are injected as ports so the
 * wiring is testable without Supabase and no second wallet or permission system
 * is created.
 */

import { agentForTaskType } from "./agents";
import { classifyTaskFailure, TaskExecutionError } from "./errors";
import type { TaskExecutor } from "./scheduler";
import type { OrchestratorTask } from "./types";

/** Reservation handle returned by the Power port. */
export type PowerReservation = {
  id: string;
  reservedPoints: number;
};

/**
 * Power port. Implemented by the existing reserve/settle/release RPCs — this
 * module never touches a balance directly and never defines a new ledger.
 */
export type PowerPort = {
  reserve: (input: {
    idempotencyKey: string;
    missionId: string;
    operation: string;
    points: number;
    taskId: string;
  }) => Promise<PowerReservation | null>;
  settle: (input: {
    actualPoints: number;
    reservationId: string;
  }) => Promise<void>;
  release: (input: { reason: string; reservationId: string }) => Promise<void>;
};

/**
 * Tool port. Implemented on top of the existing plugin permission gate and
 * execution pipeline, so a task cannot bypass the gate the plugin engine owns.
 */
export type ToolPort = {
  execute: (input: {
    attemptKey: string;
    missionId: string;
    pluginId: string;
    taskId: string;
    toolId: string;
  }) => Promise<{ output: Record<string, unknown> }>;
};

export type ExecutorPorts = {
  power?: PowerPort;
  tools?: ToolPort;
};

/** Cost of a task in Power, read from the existing action policy. */
export type TaskCostPolicy = (task: OrchestratorTask) => number;

const defaultCostPolicy: TaskCostPolicy = (task) =>
  task.metadata.chargeable === true ? 1 : 0;

/**
 * Builds the executor handed to the scheduler.
 *
 * A task without a tool binding still runs and reports honestly that it had no
 * external effect, instead of pretending a provider was called.
 */
export function createTaskExecutor({
  costPolicy = defaultCostPolicy,
  ports = {},
}: {
  costPolicy?: TaskCostPolicy;
  ports?: ExecutorPorts;
} = {}): TaskExecutor {
  return async ({ attemptKey, task }) => {
    const agentId = task.agentId || agentForTaskType(task.type);
    const pluginId =
      typeof task.inputs.pluginId === "string" ? task.inputs.pluginId : null;
    const toolId =
      typeof task.inputs.toolId === "string" ? task.inputs.toolId : null;

    const points = costPolicy(task);
    let reservation: PowerReservation | null = null;

    if (points > 0 && ports.power) {
      reservation = await ports.power.reserve({
        idempotencyKey: `${attemptKey}:power`,
        missionId: task.missionId,
        operation: `task:${task.id}`,
        points,
        taskId: task.id,
      });
      // A refused reservation is a resource problem, not a silent free run.
      if (!reservation) {
        throw new TaskExecutionError(
          "resource_unavailable",
          `Power reservation refused for task ${task.id}.`
        );
      }
    }

    try {
      let output: Record<string, unknown> = {
        agentId,
        taskId: task.id,
        taskType: task.type,
      };
      let powerCharged = 0;

      if (pluginId && toolId) {
        if (!ports.tools) {
          throw new TaskExecutionError(
            "configuration",
            `Task ${task.id} requests tool ${toolId} but no tool port is wired.`
          );
        }
        const result = await ports.tools.execute({
          attemptKey,
          missionId: task.missionId,
          pluginId,
          taskId: task.id,
          toolId,
        });
        output = { ...output, ...result.output };
        powerCharged = points;
      }

      if (reservation && ports.power) {
        await ports.power.settle({
          actualPoints: powerCharged,
          reservationId: reservation.id,
        });
      }

      return {
        artifacts: [],
        output,
        powerCharged: reservation ? powerCharged : undefined,
      };
    } catch (error) {
      // A failed task must not keep a hold on the user's Power.
      if (reservation && ports.power) {
        await ports.power
          .release({
            reason: `task_failed:${classifyTaskFailure(error)}`,
            reservationId: reservation.id,
          })
          .catch(() => undefined);
      }
      throw error;
    }
  };
}
