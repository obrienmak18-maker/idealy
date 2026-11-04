import {
  AlertCircle,
  Check,
  FileCode2,
  Image,
  LoaderCircle,
  Search,
  Users,
  Video,
} from "lucide-react";
import type React from "react";
import type {
  AssistantToolActivity,
  MissionFileActivity,
  SubAgentProgress,
} from "../../types";

const toolLabels: Record<AssistantToolActivity["kind"], string> = {
  dispatchSubAgents: "Préparation du plan d’agents",
  generateImage: "Génération d’image",
  generateVideo: "Génération vidéo",
  renderWidget: "Préparation de l’aperçu",
  searchImages: "Recherche d’images",
  webSearch: "Recherche sur le web",
};

const eventLabels: Record<string, string> = {
  agent_started: "Agent démarré",
  auto_correction_started: "Correction automatique",
  build_log: "Vérification du projet",
  file_content: "Écriture du fichier",
  file_saved: "Fichier enregistré",
  file_started: "Création du fichier",
  mission_completed: "Mission terminée",
  mission_error: "Erreur de mission",
  mission_started: "Mission démarrée",
  validation_result: "Résultat de validation",
};

const ToolIcon: React.FC<{ kind: AssistantToolActivity["kind"] }> = ({
  kind,
}) => {
  if (kind === "webSearch" || kind === "searchImages") {
    return <Search aria-hidden="true" className="h-3.5 w-3.5" />;
  }
  if (kind === "generateImage") {
    return <Image aria-hidden="true" className="h-3.5 w-3.5" />;
  }
  if (kind === "generateVideo") {
    return <Video aria-hidden="true" className="h-3.5 w-3.5" />;
  }
  if (kind === "dispatchSubAgents") {
    return <Users aria-hidden="true" className="h-3.5 w-3.5" />;
  }
  return <FileCode2 aria-hidden="true" className="h-3.5 w-3.5" />;
};

export const AssistantActivity: React.FC<{
  activities?: AssistantToolActivity[];
  fileEvents?: MissionFileActivity[];
  isStreaming?: boolean;
  subagents?: SubAgentProgress[];
}> = ({
  activities = [],
  fileEvents = [],
  isStreaming = false,
  subagents = [],
}) => {
  const latestActivities = activities.slice(-4).reverse();
  const currentFileEvents = fileEvents.reduce<MissionFileActivity[]>(
    (current, event) => {
      const path = event.path || event.file?.path;
      const key = path ? `${event.missionId}:${path}` : null;
      if (!key) {
        current.push(event);
        return current;
      }
      const previousIndex = current.findIndex(
        (item) =>
          (item.path || item.file?.path) &&
          `${item.missionId}:${item.path || item.file?.path}` === key,
      );
      if (previousIndex >= 0) current[previousIndex] = event;
      else current.push(event);
      return current;
    },
    [],
  );
  const latestFileEvents = currentFileEvents.slice(-4).reverse();
  if (!latestActivities.length && !latestFileEvents.length && !subagents.length)
    return null;

  const AGENT_TINTS = ["45,212,191", "129,140,248", "167,139,250", "251,146,60", "56,189,248"];

  type Step = { key: string; state: "running" | "done" | "failed"; label: string; detail?: string; icon: React.ReactNode };
  const steps: Step[] = [
    ...[...latestActivities].reverse().map<Step>((activity) => ({
      key: activity.toolCallId,
      state: activity.state === "output-error" ? "failed" : activity.state === "output-available" ? "done" : "running",
      label: toolLabels[activity.kind] ?? "Outil Idealy",
      icon: <ToolIcon kind={activity.kind} />,
    })),
    ...[...latestFileEvents].reverse().map<Step>((event) => {
      const failed = event.eventType === "mission_error";
      const done = event.eventType === "file_saved" || event.eventType === "mission_completed" || event.eventType === "validation_result";
      return {
        key: `${event.missionId}-${event.sequence}`,
        state: failed ? "failed" : done ? "done" : "running",
        label: eventLabels[event.eventType] ?? "Activité du projet",
        detail: event.path || event.file?.path,
        icon: <FileCode2 aria-hidden="true" className="h-3.5 w-3.5" />,
      };
    }),
  ];

  return (
    <div
      aria-label="Activité de l’assistant"
      aria-live={isStreaming ? "polite" : undefined}
      className="my-2 space-y-4 text-[13px] text-[var(--dsw-alias-label-secondary)]"
      role={isStreaming ? "status" : undefined}
    >
      {subagents.slice(-2).map((group) => {
        const total = group.agents.length || 1;
        const completed = group.agents.filter((agent) => agent.status === "completed").length;
        const failed = group.agents.filter((agent) => agent.status === "failed").length;
        const running = group.agents.filter((agent) => agent.status === "running").length;
        const active = running + group.agents.filter((agent) => agent.status === "queued").length;
        const status = active ? `${completed}/${total} · ${running} en cours` : failed ? `${completed}/${total} · ${failed} échec${failed > 1 ? "s" : ""}` : "Terminé";
        return (
          <details className="group/agents rounded-2xl border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)]/60" key={group.timestamp} open={isStreaming}>
            <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3.5 py-3 text-[var(--dsw-alias-label-primary)] [&::-webkit-details-marker]:hidden">
              <Users aria-hidden="true" className="h-4 w-4 text-[var(--dsw-alias-label-tertiary)]" />
              <span className="flex-1 text-[13.5px] font-medium">Équipe</span>
              <span className="text-[12px] text-[var(--dsw-alias-label-tertiary)]">{status}</span>
            </summary>
            <div aria-hidden="true" className="mx-3.5 flex gap-1">
              {group.agents.map((agent, i) => (
                <span
                  className={`h-[3px] flex-1 rounded-full ${agent.status === "failed" ? "bg-red-400" : agent.status === "queued" ? "bg-[var(--dsw-alias-border-l2)]" : agent.status === "running" ? "animate-pulse" : ""}`}
                  key={agent.id}
                  style={agent.status === "failed" || agent.status === "queued" ? undefined : { background: `rgba(${AGENT_TINTS[i % AGENT_TINTS.length]},${agent.status === "running" ? 0.55 : 1})` }}
                />
              ))}
            </div>
            {group.objective && <p className="mx-3.5 mt-3 text-[12.5px] leading-snug text-[var(--dsw-alias-label-tertiary)]">{group.objective}</p>}
            <ul className="space-y-3 px-3.5 pb-3.5 pt-3">
              {group.agents.map((agent, i) => {
                const rgb = AGENT_TINTS[i % AGENT_TINTS.length];
                return (
                  <li className="flex items-start gap-3" key={agent.id}>
                    <span
                      aria-hidden="true"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-medium"
                      style={{ background: `rgba(${rgb},0.14)`, color: `rgb(${rgb})`, boxShadow: agent.status === "running" ? `0 0 0 1px rgba(${rgb},0.5), 0 0 16px -2px rgba(${rgb},0.5)` : `0 0 0 1px rgba(${rgb},0.25)` }}
                    >
                      {agent.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-[var(--dsw-alias-label-primary)]">
                        {agent.name} <span className="text-[var(--dsw-alias-label-tertiary)]">· {agent.role}</span>
                      </p>
                      <p className={`text-[12.5px] leading-snug ${agent.status === "running" ? "idealy-shimmer-text" : "text-[var(--dsw-alias-label-secondary)]"}`}>{agent.task}</p>
                      {agent.summary && <p className="mt-1 text-[12.5px] leading-snug text-[var(--dsw-alias-label-tertiary)]">{agent.summary}</p>}
                    </div>
                    <span className="mt-1 shrink-0">
                      {agent.status === "completed" ? <Check aria-label="Terminé" className="h-4 w-4 text-[var(--idealy-teal-petrol)]" /> : agent.status === "failed" ? <AlertCircle aria-label="Échec" className="h-4 w-4 text-red-400" /> : agent.status === "running" ? <LoaderCircle aria-label="En cours" className="h-4 w-4 animate-spin text-[var(--dsw-alias-label-tertiary)]" /> : <span aria-label="En attente" className="block h-3.5 w-3.5 rounded-full border border-[var(--dsw-alias-border-l2)]" />}
                    </span>
                  </li>
                );
              })}
            </ul>
          </details>
        );
      })}

      {steps.length > 0 && (
        <ol className="relative space-y-2.5">
          {steps.map((step, i) => (
            <li className="relative flex min-w-0 items-start gap-3" key={step.key}>
              {i < steps.length - 1 && <span aria-hidden="true" className="absolute left-[9px] top-5 h-[calc(100%+4px)] w-px bg-[var(--dsw-alias-border-l2)]" />}
              <span className={`relative z-10 grid h-[19px] w-[19px] shrink-0 place-items-center rounded-full border bg-[var(--dsw-alias-bg-base)] ${step.state === "failed" ? "border-red-400/60 text-red-400" : step.state === "done" ? "border-[var(--idealy-teal-petrol)]/50 text-[var(--idealy-teal-petrol)]" : "border-[var(--dsw-alias-border-l2)] text-[var(--dsw-alias-label-tertiary)]"}`}>
                {step.state === "failed" ? <AlertCircle className="h-3 w-3" /> : step.state === "done" ? <Check className="h-3 w-3" /> : <LoaderCircle className="h-3 w-3 animate-spin" />}
              </span>
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 pt-px">
                <span className={step.state === "running" ? "idealy-shimmer-text" : "text-[var(--dsw-alias-label-secondary)]"}>{step.label}</span>
                {step.detail && (
                  <code className="max-w-full truncate rounded-md border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)] px-1.5 py-0.5 font-mono text-[11.5px] text-[var(--dsw-alias-label-secondary)]">{step.detail}</code>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};
