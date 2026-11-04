import { ArrowRight, Code } from "lucide-react";
import type React from "react";
import { getAgentById } from "../../services/agentRegistry";
import type { Run, RunTurn, StaticAgent } from "../../types";
import { AgentAvatar } from "./AgentAvatar";
import { ReasoningBlock } from "./ReasoningBlock";

export interface RunStageProps {
  activeAgentId?: string;
  isStreaming?: boolean;
  renderFormattedContent: (content: string) => React.ReactNode;
  run: Run;
}

const formatTurnTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * RunStage — La Scène avec la Régie.
 * 
 * Répond à tout instant à trois questions sans cliquer :
 * 1. Qui est en train de parler ?
 * 2. Sur quoi il travaille ?
 * 3. Qui prendra la suite ?
 * 
 * - Solo Run : 1 agent, 1 voix, pas de carte d'équipe.
 * - Team Run : Casting au complet visible discrètement (inactifs désaturés),
 *   passation explicite par la parole et repère visuel (Alex → Nadia).
 */
export const RunStage: React.FC<RunStageProps> = ({
  activeAgentId,
  isStreaming = false,
  renderFormattedContent,
  run,
}) => {
  const isTeam = run.mode === "équipe" && run.turns.length > 1;

  // Casting complet des agents intervenants
  const participantIds = Array.from(new Set(run.turns.map((t) => t.agentId)));
  const participants: StaticAgent[] = participantIds.map((id) => getAgentById(id));

  return (
    <div className="space-y-6" data-run-id={run.id} data-run-mode={run.mode}>
      {/* Régie d'équipe (affichée uniquement en Run d'équipe) */}
      {isTeam && (
        <div
          aria-label={`Régie de run à ${participants.length} agents`}
          className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-[var(--dsw-alias-bg-layer-2)]/60 border border-[var(--dsw-alias-border-l3)]/80 text-xs"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--dsw-alias-label-primary)]">
              Run à {participants.length}
            </span>
            <span className="text-[var(--dsw-alias-label-tertiary)] hidden sm:inline">
              · {run.reason}
            </span>
          </div>

          {/* Casting visuel : chacun avec son portrait, inactifs désaturés */}
          <div className="flex items-center gap-1.5" role="list">
            {participants.map((agent) => {
              const isActive = activeAgentId ? activeAgentId === agent.id : false;
              return (
                <div
                  className="flex items-center gap-1"
                  key={agent.id}
                  role="listitem"
                  title={`${agent.name} (${agent.role})`}
                >
                  <AgentAvatar
                    agent={agent}
                    isActive={isActive || !isStreaming}
                    size="sm"
                    state={isActive ? "production" : "terminé"}
                  />
                  <span
                    className="text-[11px] font-medium hidden md:inline transition-colors"
                    style={{
                      color: isActive ? agent.tint : "var(--dsw-alias-label-tertiary)",
                    }}
                  >
                    {agent.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Séquence des prises de parole (Turns) */}
      <div className="space-y-6">
        {run.turns.map((turn: RunTurn, index: number) => {
          const agent = getAgentById(turn.agentId);
          const nextTurn = run.turns[index + 1];
          const nextAgent = nextTurn ? getAgentById(nextTurn.agentId) : null;
          const isCurrentActive =
            isStreaming && (activeAgentId ? activeAgentId === agent.id : index === run.turns.length - 1);

          return (
            <div
              className="relative space-y-2 transition-all duration-200"
              data-turn-agent={agent.id}
              key={`${turn.agentId}-${turn.startedAt}-${index}`}
            >
              {/* En-tête de prise de parole : Portrait · Nom · Rôle · Heure */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <AgentAvatar
                    agent={agent}
                    isActive={isCurrentActive || !isStreaming}
                    size="md"
                    state={turn.state}
                  />

                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span
                      className="font-semibold text-sm tracking-tight text-[var(--dsw-alias-label-primary)]"
                      style={{
                        borderBottom: `2px solid ${agent.tint}35`,
                      }}
                    >
                      {agent.name}
                    </span>
                    <span className="text-[var(--dsw-alias-label-tertiary)]">·</span>
                    <span className="text-[var(--dsw-alias-label-secondary)] text-[12px]">
                      {agent.role}
                    </span>
                    <span className="text-[var(--dsw-alias-label-tertiary)]">·</span>
                    <time className="text-[var(--dsw-alias-label-tertiary)] text-[11px] tabular-nums">
                      {formatTurnTime(turn.startedAt)}
                    </time>
                  </div>
                </div>

                {/* Badge d'autorité exclusive de l'agent */}
                <span
                  className="hidden sm:inline-block px-2 py-0.5 rounded text-[10.5px] border"
                  style={{
                    backgroundColor: `${agent.tint}0f`,
                    borderColor: `${agent.tint}25`,
                    color: agent.tint,
                  }}
                  title={agent.authority}
                >
                  {agent.specialty.split(".")[0]}
                </span>
              </div>

              {/* Réflexion typographique dans le fil (Section 5) */}
              {Boolean(turn.reasoning) && (
                <ReasoningBlock
                  agentName={agent.name}
                  isStreaming={isCurrentActive && turn.state === "réflexion"}
                  reasoning={turn.reasoning}
                  tint={agent.tint}
                />
              )}

              {/* Production textuelle & code de l'agent */}
              {Boolean(turn.content) && (
                <div className="text-sm md:text-[15px] leading-relaxed text-[var(--dsw-alias-label-primary)] break-words pt-1">
                  {renderFormattedContent(turn.content)}
                </div>
              )}

              {/* Artefacts réels nommés (Section 7 : Pas de compteur 1/3 abstrait) */}
              {turn.artifacts && turn.artifacts.length > 0 && (
                <div className="pt-2 space-y-1.5">
                  {turn.artifacts.map((art) => (
                    <div
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)]/50 text-xs font-mono text-[var(--dsw-alias-label-secondary)]"
                      key={art.path}
                    >
                      <Code className="w-3.5 h-3.5" style={{ color: agent.tint }} />
                      <span className="truncate flex-1">{art.path}</span>
                      <span className="text-[10px] text-[var(--dsw-alias-label-tertiary)] uppercase font-sans">
                        {art.kind}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Passation explicite de micro (Section 4 : La parole fait foi) */}
              {turn.handoff && nextAgent && (
                <div className="mt-3.5 pt-2.5 pb-1 border-t border-[var(--dsw-alias-border-l3)] flex items-start gap-2 text-xs">
                  <div
                    className="inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded text-[11.5px] shrink-0"
                    style={{
                      backgroundColor: `${agent.tint}12`,
                      color: agent.tint,
                    }}
                  >
                    <span>{agent.name}</span>
                    <ArrowRight className="w-3 h-3" />
                    <span style={{ color: nextAgent.tint }}>{nextAgent.name}</span>
                  </div>
                  <p className="text-[12.5px] italic text-[var(--dsw-alias-label-secondary)] pt-0.5 leading-snug">
                    « {turn.handoff.line} »
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
