import { generateText, tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import type { ChatMessage, IdealySubAgentEvent } from "@/lib/types";
import { getLanguageModel } from "../providers";

const MAX_SUBAGENTS = 3;
const MAX_AGENT_OUTPUT_TOKENS = 420;

export type DispatchSubAgentsProps = {
  dataStream?: UIMessageStreamWriter<ChatMessage>;
  modelId: string;
};

const subAgentSchema = z.object({
  name: z.string().trim().min(1).max(48),
  role: z.string().trim().min(1).max(80),
  task: z.string().trim().min(1).max(1200),
});

function safeSummary(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > 900 ? `${cleaned.slice(0, 897)}…` : cleaned;
}

export const dispatchSubAgents = ({ dataStream, modelId }: DispatchSubAgentsProps) => {
  let hasDispatched = false;
  return tool({
    description:
      "Launch up to three independent specialist model calls in parallel for a complex task. Each specialist must have a distinct role and concrete task. The tool waits for real provider responses and returns their concise work products. Do not call for ordinary questions or claim that workers ran unless this tool returns their results.",
    inputSchema: z.object({
      squad: z
        .enum(["ninja", "mage", "hunter", "professional"])
        .optional()
        .default("professional"),
      objective: z.string().trim().min(1).max(1200),
      agents: z.array(subAgentSchema).min(1).max(MAX_SUBAGENTS),
    }),
    execute: async ({ squad = "professional", objective, agents }, { abortSignal }) => {
      if (hasDispatched) {
        return {
          objective,
          squad,
          status: "limit_reached" as const,
          message: "Une seule équipe peut être lancée par réponse.",
          agents: [],
          completedCount: 0,
          failedCount: 0,
        };
      }
      hasDispatched = true;

      const event: IdealySubAgentEvent = {
        agents: agents.map((agent, index) => ({
          id: `subagent-${index + 1}-${agent.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 36)}`,
          name: agent.name,
          role: agent.role,
          task: agent.task,
          status: "queued",
        })),
        objective,
        squad,
        timestamp: Date.now(),
      };
      const publish = () => {
        dataStream?.write({
          data: structuredClone(event),
          transient: true,
          type: "data-idealy-subagent",
        });
      };

      publish();
      const results = await Promise.all(
        agents.map(async (agent, index) => {
          const state = event.agents[index];
          if (!state) return null;
          state.status = "running";
          publish();

          try {
            const result = await generateText({
              abortSignal,
              maxOutputTokens: MAX_AGENT_OUTPUT_TOKENS,
              model: getLanguageModel(modelId),
              prompt: [
                `Shared objective: ${objective}`,
                `Your specialist role: ${agent.role}`,
                `Your assigned task: ${agent.task}`,
                "Work independently and return a concise, useful result with concrete findings or a deliverable. Do not reveal private chain-of-thought. State limitations and uncertainty clearly. Do not claim tools, tests, browsing, or code execution that you did not perform.",
              ].join("\n\n"),
              system: `You are ${agent.name}, a specialist sub-agent working as part of a team. Return only your completed work product, not a plan to do the work.`,
            });
            state.status = "completed";
            state.summary = safeSummary(result.text);
            publish();
            return {
              id: state.id,
              name: state.name,
              role: state.role,
              status: state.status,
              task: state.task,
              result: state.summary,
            };
          } catch (error) {
            state.status = "failed";
            state.summary =
              error instanceof Error
                ? safeSummary(error.message)
                : "Le fournisseur n’a pas renvoyé de résultat.";
            publish();
            return {
              id: state.id,
              name: state.name,
              role: state.role,
              status: state.status,
              task: state.task,
              error: state.summary,
            };
          }
        }),
      );

      return {
        status: "completed" as const,
        objective,
        squad,
        agents: results.filter((result): result is NonNullable<typeof result> => result !== null),
        completedCount: event.agents.filter((agent) => agent.status === "completed").length,
        failedCount: event.agents.filter((agent) => agent.status === "failed").length,
      };
    },
  });
};
