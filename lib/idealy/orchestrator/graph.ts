/**
 * Mission DAG validation + dependency resolution (pure, no I/O).
 */
import type {
  NewOrchestratorTask,
  OrchestratorTask,
  OrchestratorTaskStatus,
} from "./types";
import { createOrchestratorTask } from "./types";

export type DagCode =
  | "EMPTY_GRAPH"
  | "DUPLICATE_TASK"
  | "SELF_DEPENDENCY"
  | "DUP_DEP"
  | "MISSING_DEP"
  | "CYCLE";

export type DagIssue = { code: DagCode; message: string };

export class DagValidationFailed extends Error {
  readonly errors: DagIssue[];
  constructor(errors: DagIssue[]) {
    super(errors.map((e) => `${e.code}: ${e.message}`).join("; "));
    this.name = "DagValidationFailed";
    this.errors = errors;
  }
}

export function buildTaskGraph(
  missionId: string,
  inputs: NewOrchestratorTask[]
): OrchestratorTask[] {
  if (inputs.length === 0) {
    throw new DagValidationFailed([
      { code: "EMPTY_GRAPH", message: "Mission graph is empty." },
    ]);
  }
  const seen = new Set<string>();
  const errors: DagIssue[] = [];
  for (const input of inputs) {
    if (seen.has(input.id)) {
      errors.push({ code: "DUPLICATE_TASK", message: `Dup: ${input.id}` });
    }
    seen.add(input.id);
    const deps = input.dependencies ?? [];
    if (deps.includes(input.id)) {
      errors.push({
        code: "SELF_DEPENDENCY",
        message: `${input.id} depends on itself`,
      });
    }
    if (new Set(deps).size !== deps.length) {
      errors.push({ code: "DUP_DEP", message: `${input.id} dup dep` });
    }
    for (const dep of deps) {
      if (!inputs.some((t) => t.id === dep)) {
        errors.push({ code: "MISSING_DEP", message: `${input.id}->${dep}?` });
      }
    }
  }
  if (errors.length > 0) {
    throw new DagValidationFailed(errors);
  }
  const tasks = inputs.map((i) => createOrchestratorTask(missionId, i));
  const cycle = findCycle(tasks);
  if (cycle) {
    throw new DagValidationFailed([
      { code: "CYCLE", message: `Cycle: ${cycle.join(" -> ")}` },
    ]);
  }
  return tasks;
}

export function findCycle(tasks: OrchestratorTask[]): string[] | null {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];
  const visit = (id: string): string[] | null => {
    if (visited.has(id)) {
      return null;
    }
    if (visiting.has(id)) {
      return [...stack.slice(stack.indexOf(id)), id];
    }
    visiting.add(id);
    stack.push(id);
    for (const dep of byId.get(id)?.dependencies ?? []) {
      const hit = visit(dep);
      if (hit) {
        return hit;
      }
    }
    stack.pop();
    visiting.delete(id);
    visited.add(id);
    return null;
  };
  for (const t of tasks) {
    const hit = visit(t.id);
    if (hit) {
      return hit;
    }
  }
  return null;
}

export function topologicalOrder(tasks: OrchestratorTask[]): string[] {
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const t of tasks) {
    indegree.set(t.id, t.dependencies.length);
    for (const dep of t.dependencies) {
      const list = dependents.get(dep) ?? [];
      list.push(t.id);
      dependents.set(dep, list);
    }
  }
  const queue = [...indegree.entries()]
    .filter(([, d]) => d === 0)
    .map(([id]) => id)
    .sort((a, b) => a.localeCompare(b));
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    order.push(id);
    for (const next of dependents.get(id) ?? []) {
      const remaining = (indegree.get(next) ?? 1) - 1;
      indegree.set(next, remaining);
      if (remaining === 0) {
        queue.push(next);
      }
    }
    queue.sort();
  }
  if (order.length !== tasks.length) {
    throw new DagValidationFailed([
      { code: "CYCLE", message: "Dependency cycle detected." },
    ]);
  }
  return order;
}

export function resolveReadyTasks(
  tasks: OrchestratorTask[]
): OrchestratorTask[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  return tasks.filter((task) => {
    if (
      task.status !== "pending" &&
      task.status !== "blocked" &&
      task.status !== "ready"
    ) {
      return false;
    }
    if (task.dependencies.length === 0) {
      return true;
    }
    return task.dependencies.every((d) => byId.get(d)?.status === "success");
  });
}

export function resolveBlockedTasks(
  tasks: OrchestratorTask[]
): OrchestratorTask[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const bad: ReadonlySet<OrchestratorTaskStatus> = new Set([
    "failed",
    "cancelled",
    "skipped",
  ]);
  return tasks.filter((task) => {
    if (task.status !== "pending" && task.status !== "blocked") {
      return false;
    }
    return task.dependencies.some((d) => {
      const p = byId.get(d);
      return p !== undefined && bad.has(p.status);
    });
  });
}

/**
 * Tasks with no path from any root. In a valid mission graph every task is
 * reachable; an unreachable task signals a wiring mistake worth rejecting.
 */
export function findUnreachableTasks(tasks: OrchestratorTask[]): string[] {
  const ids = new Set(tasks.map((t) => t.id));
  const reachable = new Set<string>();
  const visit = (id: string): void => {
    if (reachable.has(id) || !ids.has(id)) {
      return;
    }
    reachable.add(id);
    const dependents = tasks.filter((t) => t.dependencies.includes(id));
    for (const next of dependents) {
      visit(next.id);
    }
  };
  for (const task of tasks) {
    if (task.dependencies.length === 0) {
      visit(task.id);
    }
  }
  return tasks.map((t) => t.id).filter((id) => !reachable.has(id));
}

/** True when every task reached a terminal state. */
export function isGraphComplete(tasks: OrchestratorTask[]): boolean {
  return tasks.every(
    (t) =>
      t.status === "success" ||
      t.status === "failed" ||
      t.status === "cancelled" ||
      t.status === "skipped"
  );
}
