/**
 * Agent bindings for the DAG scheduler.
 */
import type { NewOrchestratorTask, OrchestratorTaskType } from "./types";

export const ORCHESTRATOR_AGENTS = [
  "idealy",
  "architect",
  "builder",
  "reviewer",
] as const;

export type OrchestratorAgentId = (typeof ORCHESTRATOR_AGENTS)[number];

const TASK_AGENT: Readonly<Record<OrchestratorTaskType, OrchestratorAgentId>> =
  {
    analyze: "idealy",
    architect: "architect",
    asset_plan: "idealy",
    build: "builder",
    deploy: "builder",
    design: "architect",
    fix: "builder",
    research: "idealy",
    review: "reviewer",
    run: "builder",
    verify: "reviewer",
  };

export function agentForTaskType(
  type: OrchestratorTaskType
): OrchestratorAgentId {
  return TASK_AGENT[type];
}

/** Canonical mission blueprint used by tests and the demo workspace. */
export function defaultMissionBlueprint(): NewOrchestratorTask[] {
  return [
    { agentId: "idealy", id: "analyze", type: "analyze" },
    {
      agentId: "architect",
      dependencies: ["analyze"],
      id: "architect",
      type: "architect",
    },
    {
      agentId: "architect",
      dependencies: ["architect"],
      id: "design",
      type: "design",
    },
    {
      agentId: "idealy",
      dependencies: ["architect"],
      id: "research",
      type: "research",
    },
    {
      agentId: "idealy",
      dependencies: ["architect"],
      id: "asset-plan",
      type: "asset_plan",
    },
    {
      agentId: "builder",
      dependencies: ["design", "research", "asset-plan"],
      id: "build",
      type: "build",
    },
    { agentId: "builder", dependencies: ["build"], id: "run", type: "run" },
    {
      agentId: "reviewer",
      dependencies: ["run"],
      id: "review",
      type: "review",
    },
    { agentId: "builder", dependencies: ["review"], id: "fix", type: "fix" },
    {
      agentId: "reviewer",
      dependencies: ["fix"],
      id: "verify",
      type: "verify",
    },
  ];
}
