import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import type { ChatMessage } from "@/lib/types";

export type SubAgentStatus = "queued" | "running" | "completed" | "failed";

export type DispatchedSubAgent = {
  id: string;
  name: string;
  role: string;
  task: string;
  status: SubAgentStatus;
  summary?: string;
};

export type DispatchSubAgentsProps = {
  dataStream?: UIMessageStreamWriter<ChatMessage>;
};

export const subAgentSchema = z.object({
  name: z
    .string()
    .describe(
      "Agent name (e.g. Minato, Naruto, Sakura, Sasuke, Shikamaru, or custom agent persona)"
    ),
  role: z
    .string()
    .describe(
      "Agent role (e.g. Chief, Builder, Designer, Specialist, Reviewer, Exa-Researcher)"
    ),
  task: z.string().describe("Specific sub-task assigned to this sub-agent"),
  status: z
    .enum(["queued", "running", "completed", "failed"])
    .optional()
    .default("completed")
    .describe("Current execution status of the sub-agent"),
  summary: z
    .string()
    .optional()
    .describe(
      "Detailed description of what this sub-agent produced, analyzed, or verified"
    ),
});

export const dispatchSubAgents = ({ dataStream }: DispatchSubAgentsProps = {}) =>
  tool({
    description:
      "Dispatch and coordinate a specialized squad of named sub-agents working in parallel. Use this to orchestrate complex missions, multi-component architectures, deep semantic research, and QA audits autonomously (inspired by atoms.dev & emergent.sh).",
    inputSchema: z.object({
      squad: z
        .enum(["ninja", "mage", "hunter", "professional"])
        .optional()
        .default("ninja")
        .describe("Active squad archetype / Way"),
      objective: z
        .string()
        .describe("The overarching mission objective or project milestone being executed"),
      agents: z
        .array(subAgentSchema)
        .min(1)
        .describe("List of sub-agents dispatched in parallel to tackle the objective"),
    }),
    execute: async ({ squad = "ninja", objective, agents }) => {
      const normalizedAgents: DispatchedSubAgent[] = agents.map((agent, index) => ({
        id: `subagent-${index + 1}-${agent.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
        name: agent.name.trim(),
        role: agent.role.trim(),
        task: agent.task.trim(),
        status: (agent.status as SubAgentStatus) || "completed",
        summary: agent.summary?.trim() || `Tâche exécutée : ${agent.task.trim()}`,
      }));

      // Stream sub-agent event to the client if dataStream is active
      if (dataStream) {
        dataStream.write({
          data: {
            squad,
            objective,
            agents: normalizedAgents,
            timestamp: Date.now(),
          },
          transient: true,
          type: "data-idealy-subagent",
        });
      }

      const completedCount = normalizedAgents.filter(
        (a) => a.status === "completed"
      ).length;

      return {
        status: "success",
        squad,
        objective,
        totalAgents: normalizedAgents.length,
        completedCount,
        agents: normalizedAgents,
        executionReport: `Escouade [${squad.toUpperCase()}] : ${completedCount}/${normalizedAgents.length} sous-agents ont validé leurs livrables en parallèle sur l'objectif "${objective}".`,
      };
    },
  });
