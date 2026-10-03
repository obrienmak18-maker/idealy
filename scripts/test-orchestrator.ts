/**
 * Mission DAG orchestrator behavioural tests.
 * Run with: pnpm run test:orchestrator
 */
import assert from "node:assert/strict";
import {
  agentForTaskType,
  assertMissionStatusTransition,
  assertTaskStatusTransition,
  buildTaskGraph,
  buildTimelineFromEvents,
  canTransitionMissionStatus,
  canTransitionTaskStatus,
  classifyTaskFailure,
  createOrchestrationEvent,
  createOrchestratorTask,
  createTaskExecutor,
  DagValidationFailed,
  defaultMissionBlueprint,
  findCycle,
  isOrchestratorTaskType,
  isUuid,
  resolveBlockedTasks,
  resolveReadyTasks,
  rowToTask,
  runMissionGraph,
  runTaskAttempt,
  shouldRetryTask,
  summarizeTasks,
  TaskExecutionError,
  topologicalOrder,
} from "../lib/idealy/orchestrator/index";

let passed = 0;
function check(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed += 1;
      console.log(`  ok  ${name}`);
    });
}

const MID = "00000000-0000-4000-8000-000000000001";
const task = (id: string, deps: string[] = [], agent = "idealy") => ({
  agentId: agent,
  dependencies: deps,
  id,
  type: "build" as const,
});

async function main() {
  console.log("Idealy mission DAG orchestrator tests");
  await check("validation: empty graph rejected", () => {
    assert.throws(() => buildTaskGraph(MID, []), DagValidationFailed);
  });
  await check("validation: duplicate task rejected", () => {
    assert.throws(
      () => buildTaskGraph(MID, [task("a"), task("a")]),
      DagValidationFailed
    );
  });
  await check("validation: missing dependency rejected", () => {
    assert.throws(
      () => buildTaskGraph(MID, [task("a", ["nope"])]),
      DagValidationFailed
    );
  });
  await check("validation: self dependency rejected", () => {
    assert.throws(
      () => buildTaskGraph(MID, [task("a", ["a"])]),
      (e: unknown) => e instanceof DagValidationFailed
    );
  });
  await check("validation: duplicate dependency rejected", () => {
    assert.throws(
      () => buildTaskGraph(MID, [task("a", ["b", "b"]), task("b")]),
      DagValidationFailed
    );
  });
  await check("validation: cycle rejected", () => {
    assert.throws(
      () =>
        buildTaskGraph(MID, [
          task("a", ["b"]),
          task("b", ["c"]),
          task("c", ["a"]),
        ]),
      DagValidationFailed
    );
  });
  await check("validation: acyclic graph has no cycle", () => {
    const noCycle = findCycle(
      buildTaskGraph(MID, [task("a"), task("b", ["a"])])
    );
    assert.equal(noCycle, null);
  });
  await check("deps: only dependency-free tasks are ready", () => {
    const g = buildTaskGraph(MID, [task("a"), task("b", ["a"])]);
    assert.deepEqual(
      resolveReadyTasks(g).map((t) => t.id),
      ["a"]
    );
  });
  await check("deps: success unlocks dependents", () => {
    const g = buildTaskGraph(MID, [task("a"), task("b", ["a"])]);
    const done = g.map((t) =>
      t.id === "a" ? { ...t, status: "success" as const } : t
    );
    assert.deepEqual(
      resolveReadyTasks(done).map((t) => t.id),
      ["b"]
    );
  });
  await check("deps: failure blocks dependents", () => {
    const g = buildTaskGraph(MID, [task("a"), task("b", ["a"])]);
    const broken = g.map((t) =>
      t.id === "a" ? { ...t, status: "failed" as const } : t
    );
    assert.deepEqual(
      resolveReadyTasks(broken).map((t) => t.id),
      []
    );
    assert.deepEqual(
      resolveBlockedTasks(broken).map((t) => t.id),
      ["b"]
    );
  });
  await check("topo: dependencies come first", () => {
    const g = buildTaskGraph(MID, [
      task("a"),
      task("b", ["a"]),
      task("c", ["a"]),
      task("d", ["b", "c"]),
    ]);
    const order = topologicalOrder(g);
    assert.ok(order.indexOf("a") < order.indexOf("b"));
    assert.ok(order.indexOf("d") > order.indexOf("b"));
    assert.ok(order.indexOf("d") > order.indexOf("c"));
  });
  await check("states: blocked cannot jump to running", () => {
    assert.equal(canTransitionTaskStatus("pending", "ready"), true);
    assert.equal(canTransitionTaskStatus("blocked", "running"), false);
    assert.throws(() => assertTaskStatusTransition("blocked", "running"));
  });
  await check("states: task ids and types validated", () => {
    assert.throws(() =>
      createOrchestratorTask(MID, {
        agentId: "idealy",
        id: "bad id!",
        type: "build",
      })
    );
    assert.equal(isOrchestratorTaskType("deploy"), true);
    assert.equal(isOrchestratorTaskType("teleport"), false);
  });
  await check("states: mission transitions are strict", () => {
    assert.equal(canTransitionMissionStatus("draft", "planned"), true);
    assert.equal(canTransitionMissionStatus("draft", "completed"), false);
    assert.throws(() => assertMissionStatusTransition("completed", "running"));
  });
  await check("retry: only transient failures retry", () => {
    assert.equal(
      classifyTaskFailure(new TaskExecutionError("timeout", "t")),
      "timeout"
    );
    assert.equal(
      classifyTaskFailure(new Error("permission denied")),
      "permission"
    );
    assert.equal(shouldRetryTask(1, 3, "timeout"), true);
    assert.equal(shouldRetryTask(3, 3, "timeout"), false);
    assert.equal(shouldRetryTask(1, 3, "permission"), false);
    assert.equal(shouldRetryTask(1, 3, "invalid_input"), false);
  });
  await check("agents: task types map to the squad", () => {
    assert.equal(agentForTaskType("review"), "reviewer");
    assert.equal(agentForTaskType("build"), "builder");
    assert.equal(agentForTaskType("architect"), "architect");
    assert.equal(defaultMissionBlueprint().length, 10);
  });
  await check("scheduler: B never starts before A", async () => {
    const g = buildTaskGraph(MID, [task("a"), task("b", ["a"])]);
    const started: string[] = [];
    const result = await runMissionGraph({
      executor: ({ task: t }) => {
        started.push(t.id);
        return Promise.resolve({ output: { done: t.id } });
      },
      missionId: MID,
      options: { executionId: "exec-dep", maxConcurrentTasks: 3 },
      tasks: g,
    });
    assert.deepEqual(started, ["a", "b"]);
    assert.equal(result.missionStatus, "completed");
  });
  await check("scheduler: independent tasks overlap", async () => {
    const g = buildTaskGraph(MID, [
      task("a"),
      task("b", ["a"]),
      task("c", ["a"]),
    ]);
    let inFlight = 0;
    let maxInFlight = 0;
    const result = await runMissionGraph({
      executor: async ({ task: t }) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((r) => setTimeout(r, 20));
        inFlight -= 1;
        return { output: { done: t.id } };
      },
      missionId: MID,
      options: { executionId: "exec-para", maxConcurrentTasks: 3 },
      tasks: g,
    });
    assert.ok(maxInFlight >= 2, `expected overlap, saw ${maxInFlight}`);
    assert.equal(result.missionStatus, "completed");
  });
  await check("scheduler: concurrency capped", async () => {
    const g = buildTaskGraph(MID, [task("a"), task("b"), task("c"), task("d")]);
    let inFlight = 0;
    let maxInFlight = 0;
    await runMissionGraph({
      executor: async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((r) => setTimeout(r, 10));
        inFlight -= 1;
        return { output: {} };
      },
      missionId: MID,
      options: { executionId: "exec-cap", maxConcurrentTasks: 2 },
      tasks: g,
    });
    assert.ok(maxInFlight <= 2, `cap violated: ${maxInFlight}`);
  });
  await check("scheduler: fan-in waits for branches", async () => {
    const g = buildTaskGraph(MID, [
      task("a"),
      task("b", ["a"]),
      task("c", ["a"]),
      task("d", ["a"]),
      task("e", ["b", "c", "d"]),
    ]);
    const finished = new Set<string>();
    let eStartedAfter: string[] = [];
    await runMissionGraph({
      executor: async ({ task: t }) => {
        if (t.id === "e") {
          eStartedAfter = [...finished];
        }
        await new Promise((r) => setTimeout(r, 5));
        finished.add(t.id);
        return { output: {} };
      },
      missionId: MID,
      options: { executionId: "exec-fan", maxConcurrentTasks: 3 },
      tasks: g,
    });
    for (const need of ["b", "c", "d"]) {
      assert.ok(eStartedAfter.includes(need), `E started before ${need}`);
    }
  });
  await check("scheduler: transient failure retried", async () => {
    const g = buildTaskGraph(MID, [task("a")]);
    let calls = 0;
    const result = await runMissionGraph({
      executor: () => {
        calls += 1;
        if (calls === 1) {
          return Promise.reject(new TaskExecutionError("timeout", "timed out"));
        }
        return Promise.resolve({ output: { calls } });
      },
      missionId: MID,
      options: { executionId: "exec-retry", maxConcurrentTasks: 1 },
      tasks: g,
    });
    assert.equal(calls, 2);
    assert.equal(result.tasks[0].attempts, 2);
    assert.equal(result.tasks[0].status, "success");
  });
  await check("scheduler: permission failure never retried", async () => {
    const g = buildTaskGraph(MID, [task("a")]);
    let calls = 0;
    const result = await runMissionGraph({
      executor: () => {
        calls += 1;
        return Promise.reject(
          new TaskExecutionError("permission", "permission denied")
        );
      },
      missionId: MID,
      options: { executionId: "exec-perm", maxConcurrentTasks: 1 },
      tasks: g,
    });
    assert.equal(calls, 1);
    assert.equal(result.tasks[0].status, "failed");
  });
  await check("idempotency: double signal, one execution", async () => {
    const g = buildTaskGraph(MID, [task("a")]);
    const [built] = g;
    let calls = 0;
    const executor = () => {
      calls += 1;
      return Promise.resolve({ output: {} });
    };
    await runTaskAttempt({
      executionId: "exec-idem",
      executor,
      missionId: MID,
      task: built,
    });
    assert.equal(built.status, "success");
    await runTaskAttempt({
      executionId: "exec-idem",
      executor,
      missionId: MID,
      task: built,
    });
    assert.equal(calls, 1);
  });
  await check("resume: failed retried, validated kept", async () => {
    const g = buildTaskGraph(MID, [
      task("a"),
      task("b"),
      { ...task("c", ["a", "b"]), maxAttempts: 1 },
      task("d", ["c"]),
    ]);
    const first = await runMissionGraph({
      executor: ({ task: t }) => {
        if (t.id === "c") {
          return Promise.reject(new TaskExecutionError("timeout", "t/o"));
        }
        return Promise.resolve({ output: {} });
      },
      missionId: MID,
      options: { executionId: "exec-resume-1", maxConcurrentTasks: 2 },
      tasks: g,
    });
    const byId = new Map(first.tasks.map((t) => [t.id, t]));
    assert.equal(byId.get("a")?.status, "success");
    assert.equal(byId.get("b")?.status, "success");
    assert.equal(byId.get("c")?.status, "failed");
    assert.equal(byId.get("d")?.status ?? "", "blocked");
    const resumed = first.tasks.map((t) =>
      t.id === "c"
        ? {
            ...t,
            attempts: 0,
            error: null,
            failedAt: null,
            status: "ready" as const,
          }
        : t
    );
    const second = await runMissionGraph({
      executor: () => Promise.resolve({ output: {} }),
      missionId: MID,
      options: { executionId: "exec-resume-2", maxConcurrentTasks: 2 },
      tasks: resumed,
    });
    const after = new Map(second.tasks.map((t) => [t.id, t]));
    assert.equal(after.get("a")?.attempts, 1);
    assert.equal(after.get("b")?.attempts, 1);
    assert.equal(after.get("c")?.status, "success");
    assert.equal(after.get("d")?.status, "success");
    assert.equal(second.missionStatus, "completed");
  });
  await check("scheduler: pending mission cancels cleanly", async () => {
    const g = buildTaskGraph(MID, [task("a"), task("b")]);
    const result = await runMissionGraph({
      executor: () => Promise.resolve({ output: {} }),
      missionId: MID,
      options: { executionId: "exec-cancel", maxConcurrentTasks: 2 },
      signal: { cancelled: true },
      tasks: g,
    });
    assert.ok(result.tasks.every((t) => t.status === "cancelled"));
  });
  await check("events: timeline rebuilt from events", async () => {
    const g = buildTaskGraph(MID, [task("a"), task("b", ["a"])]);
    const seen: string[] = [];
    const result = await runMissionGraph({
      executor: () => Promise.resolve({ output: {} }),
      missionId: MID,
      options: {
        executionId: "exec-events",
        maxConcurrentTasks: 2,
        onEvent: (e) => {
          seen.push(e.type);
        },
      },
      tasks: g,
    });
    assert.ok(seen.includes("mission_started"));
    assert.ok(seen.includes("task_succeeded"));
    const timeline = buildTimelineFromEvents(result.events);
    assert.ok(timeline.length >= 4);
    const probe = createOrchestrationEvent({
      message: "x",
      missionId: MID,
      type: "task_progress",
    });
    assert.equal(probe.taskId, null);
  });
  await check("executor: tool invoked with attempt key", async () => {
    const executed: Record<string, unknown>[] = [];
    const settled: Record<string, unknown>[] = [];
    const executor = createTaskExecutor({
      ports: {
        power: {
          release: async () => undefined,
          reserve: async () => ({ id: "r1", reservedPoints: 1 }),
          settle: (input) => {
            settled.push(input);
            return Promise.resolve();
          },
        },
        tools: {
          execute: (input) => {
            executed.push(input);
            return Promise.resolve({ output: { ok: true } });
          },
        },
      },
    });
    const t = createOrchestratorTask(MID, {
      agentId: "mock",
      id: "a",
      inputs: { pluginId: "supabase", toolId: "run_sql" },
      metadata: { chargeable: true },
      type: "build",
    });
    const result = await executor({
      attempt: 1,
      attemptKey: "attempt-1",
      task: t,
    });
    assert.equal(executed.length, 1);
    assert.equal(executed[0]?.attemptKey, "attempt-1");
    assert.equal(executed[0]?.pluginId, "supabase");
    assert.equal(result.output.ok, true);
    assert.equal(result.powerCharged, 1);
    assert.deepEqual(settled, [{ actualPoints: 1, reservationId: "r1" }]);
  });
  await check("executor: permission failure releases power", async () => {
    const released: string[] = [];
    const executor = createTaskExecutor({
      ports: {
        power: {
          release: (input) => {
            released.push(input.reason);
            return Promise.resolve();
          },
          reserve: async () => ({ id: "r2", reservedPoints: 1 }),
          settle: () =>
            Promise.reject(new Error("settle must not run on failure")),
        },
        tools: {
          execute: () =>
            Promise.reject(new TaskExecutionError("permission", "denied")),
        },
      },
    });
    const t = createOrchestratorTask(MID, {
      agentId: "mock",
      id: "a",
      inputs: { pluginId: "supabase", toolId: "run_sql" },
      metadata: { chargeable: true },
      type: "build",
    });
    await assert.rejects(
      executor({ attempt: 1, attemptKey: "attempt-1", task: t }),
      TaskExecutionError
    );
    assert.equal(released.length, 1);
    assert.ok(released[0]?.startsWith("task_failed:permission"));
  });
  await check("executor: non-chargeable task never reserves", async () => {
    let reserved = 0;
    const executor = createTaskExecutor({
      ports: {
        power: {
          release: async () => undefined,
          reserve: () => {
            reserved += 1;
            return Promise.resolve(null);
          },
          settle: async () => undefined,
        },
        tools: { execute: async () => ({ output: {} }) },
      },
    });
    const t = createOrchestratorTask(MID, {
      agentId: "mock",
      id: "a",
      inputs: { pluginId: "p", toolId: "t" },
      type: "build",
    });
    const result = await executor({
      attempt: 1,
      attemptKey: "attempt-1",
      task: t,
    });
    assert.equal(reserved, 0);
    assert.equal(result.powerCharged, undefined);
  });
  await check("executor: tool task without port fails honestly", async () => {
    const executor = createTaskExecutor();
    const t = createOrchestratorTask(MID, {
      agentId: "mock",
      id: "a",
      inputs: { pluginId: "p", toolId: "t" },
      type: "build",
    });
    await assert.rejects(
      executor({ attempt: 1, attemptKey: "attempt-1", task: t }),
      (e: unknown) =>
        e instanceof TaskExecutionError && e.failureClass === "configuration"
    );
  });
  await check("persistence: valid row round-trips", () => {
    const t = rowToTask({
      agent_id: "mock",
      attempt_key: "attempt-1",
      attempts: 2,
      dependencies: ["a"],
      error: null,
      inputs: { pluginId: "supabase" },
      max_attempts: 3,
      mission_id: MID,
      name: "Build site",
      outputs: { url: "x" },
      result: {
        artifacts: [],
        durationMs: 10,
        executionId: "exec-1",
        metadata: {},
        output: { ok: true },
        status: "success",
        usage: { powerCharged: 1 },
      },
      status: "retrying",
      task_key: "b",
      task_type: "build",
    });
    assert.ok(t);
    assert.equal(t?.dependencies.length, 1);
    assert.equal(t?.status, "retrying");
    assert.equal(t?.result?.status, "success");
    assert.equal(t?.result?.usage?.powerCharged, 1);
    assert.equal(t?.attemptKey, "attempt-1");
  });
  await check("persistence: corrupt rows rejected, not coerced", () => {
    assert.equal(rowToTask({ mission_id: MID, status: "weird" }), null);
    assert.equal(
      rowToTask({ mission_id: MID, status: "ready", task_key: "a" }),
      null
    );
    assert.equal(
      rowToTask({
        mission_id: MID,
        status: "success",
        task_key: "a",
        task_type: "mystery",
      }),
      null
    );
    // Corrupt result must not fake a completed task outcome.
    const t = rowToTask({
      mission_id: MID,
      result: { status: "not-a-status" },
      status: "success",
      task_key: "a",
      task_type: "build",
    });
    assert.equal(t?.result, null);
    assert.equal(isUuid(MID), true);
    assert.equal(isUuid("not-a-uuid"), false);
  });
  await check("persistence: summary reports real counts", () => {
    const tasks = [
      createOrchestratorTask(MID, { agentId: "m", id: "a", type: "build" }),
      createOrchestratorTask(MID, {
        agentId: "m",
        dependencies: ["a"],
        id: "b",
        type: "build",
      }),
      {
        ...createOrchestratorTask(MID, {
          agentId: "m",
          id: "c",
          type: "build",
        }),
        status: "success" as const,
      },
    ];
    const summary = summarizeTasks(tasks);
    assert.equal(summary.total, 3);
    assert.equal(summary.completed, 1);
    assert.equal(summary.byStatus.pending, 1);
    assert.equal(summary.byStatus.blocked, 1);
  });
  console.log(`\nAll ${passed} orchestrator assertions passed.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
