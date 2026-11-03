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

  return (
    <div
      aria-label="Activité de l’assistant"
      aria-live={isStreaming ? "polite" : undefined}
      className="space-y-1.5 rounded-xl bg-[var(--dsw-alias-interactive-bg-hover)]/55 px-3 py-2.5 text-[12px] text-[var(--dsw-alias-label-secondary)]"
      role={isStreaming ? "status" : undefined}
    >
      {subagents.slice(-2).map((group) => {
        const completedCount = group.agents.filter(
          (agent) => agent.status === "completed",
        ).length;
        const failedCount = group.agents.filter(
          (agent) => agent.status === "failed",
        ).length;
        const runningCount = group.agents.filter(
          (agent) => agent.status === "running",
        ).length;
        const queuedCount = group.agents.filter(
          (agent) => agent.status === "queued",
        ).length;
        const activeCount = runningCount + queuedCount;
        const statusLabel = activeCount
          ? `${runningCount} en cours${queuedCount ? ` · ${queuedCount} en attente` : ""}`
          : failedCount
            ? `${completedCount} terminés · ${failedCount} échec${failedCount > 1 ? "s" : ""}`
            : "Travail terminé";
        return (
          <details
            className="idealy-agent-group rounded-lg bg-[var(--dsw-alias-interactive-bg-hover)]/55 px-2.5 py-2"
            key={group.timestamp}
            open={isStreaming}
          >
            <summary className="flex cursor-pointer list-none items-center gap-2 text-[var(--dsw-alias-label-primary)] [&::-webkit-details-marker]:hidden">
              <Users
                aria-hidden="true"
                className={`h-3.5 w-3.5 shrink-0 ${activeCount ? "text-[var(--idealy-teal-petrol)]" : ""}`}
              />
              <span className="min-w-0 flex-1 truncate">Équipe d’agents</span>
              <span className="ml-auto shrink-0 text-[10px] text-[var(--dsw-alias-label-tertiary)]">
                {statusLabel}
              </span>
            </summary>
            <div aria-hidden="true" className="mt-2 flex gap-1">
              {group.agents.map((agent) => (
                <span
                  className={`h-[3px] flex-1 rounded-full ${
                    agent.status === "completed"
                      ? "bg-[var(--idealy-teal-petrol)]"
                      : agent.status === "failed"
                        ? "bg-red-400"
                        : agent.status === "running"
                          ? "bg-[var(--idealy-teal-petrol)]/55 animate-pulse"
                          : "bg-[var(--dsw-alias-border-l2)]"
                  }`}
                  key={agent.id}
                />
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-4 text-[var(--dsw-alias-label-tertiary)]">
              {group.objective}
            </p>
            <div className="mt-2 space-y-2">
              {group.agents.map((agent) => (
                <div className="flex items-start gap-2" key={agent.id}>
                  <span className="mt-0.5 shrink-0 text-[var(--dsw-alias-label-tertiary)]">
                    {agent.status === "completed" ? (
                      <Check aria-hidden="true" className="h-3.5 w-3.5 text-[var(--idealy-teal-petrol)]" />
                    ) : agent.status === "failed" ? (
                      <AlertCircle aria-hidden="true" className="h-3.5 w-3.5 text-red-400" />
                    ) : agent.status === "running" ? (
                      <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <span aria-label="En attente" className="block h-3.5 w-3.5 rounded-full border border-current" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-[var(--dsw-alias-label-primary)]">
                      {agent.name} <span className="font-normal text-[var(--dsw-alias-label-tertiary)]">· {agent.role}</span>
                    </p>
                    <p className="text-[11px] leading-4 text-[var(--dsw-alias-label-secondary)]">{agent.task}</p>
                    {agent.summary && (
                      <p className="mt-1 whitespace-normal text-[11px] leading-4 text-[var(--dsw-alias-label-tertiary)]">
                        {agent.summary}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] text-[var(--dsw-alias-label-tertiary)]">
                    {agent.status === "completed"
                      ? "Terminé"
                      : agent.status === "failed"
                        ? "Échec"
                        : agent.status === "running"
                          ? "En cours"
                          : "À venir"}
                  </span>
                </div>
              ))}
            </div>
          </details>
        );
      })}
      {latestActivities.map((activity) => {
        const failed = activity.state === "output-error";
        const finished = activity.state === "output-available";
        return (
          <div className="flex min-w-0 items-center gap-2" key={activity.toolCallId}>
            <span className="shrink-0 text-[var(--dsw-alias-label-tertiary)]">
              {failed ? (
                <AlertCircle aria-hidden="true" className="h-3.5 w-3.5 text-red-400" />
              ) : finished ? (
                <Check aria-hidden="true" className="h-3.5 w-3.5 text-[var(--idealy-teal-petrol)]" />
              ) : (
                <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
              )}
            </span>
            <ToolIcon kind={activity.kind} />
            <span className="truncate">{toolLabels[activity.kind] ?? "Outil Idealy"}</span>
            <span className="ml-auto shrink-0 text-[var(--dsw-alias-label-tertiary)]">
              {failed
                ? "Échec"
                : activity.kind === "dispatchSubAgents"
                  ? finished
                    ? "Plan reçu"
                    : "Préparation"
                  : finished
                    ? "Terminé"
                    : "En cours"}
            </span>
          </div>
        );
      })}
      {latestFileEvents.map((event) => {
        const failed = event.eventType === "mission_error";
        const finished =
          event.eventType === "file_saved" ||
          event.eventType === "mission_completed" ||
          event.eventType === "validation_result";
        return (
          <div
            className="flex min-w-0 items-center gap-2"
            key={`${event.missionId}-${event.sequence}`}
          >
            <span className="shrink-0 text-[var(--dsw-alias-label-tertiary)]">
              {failed ? (
                <AlertCircle aria-hidden="true" className="h-3.5 w-3.5 text-red-400" />
              ) : finished ? (
                <Check aria-hidden="true" className="h-3.5 w-3.5 text-[var(--idealy-teal-petrol)]" />
              ) : (
                <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
              )}
            </span>
            <FileCode2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {eventLabels[event.eventType] ?? "Activité du projet"}
              {(event.path || event.file?.path) && (
                <span className="ml-1 text-[var(--dsw-alias-label-tertiary)]">
                  · {event.path || event.file?.path}
                </span>
              )}
            </span>
            <span className="ml-auto shrink-0 text-[var(--dsw-alias-label-tertiary)]">
              {failed ? "Échec" : finished ? "Terminé" : "En cours"}
            </span>
          </div>
        );
      })}
    </div>
  );
};
