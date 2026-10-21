"use client";

import { LoaderCircle, RadioTower } from "lucide-react";

type MultiAgentRelayProps = {
  activityState: "building" | "correcting";
  currentAgentName: string;
  currentWay: string;
  hasToolExecution: boolean;
  isFinished: boolean;
  isLoading: boolean;
};

const wayLabels: Record<string, string> = {
  hunter: "Hunter",
  mage: "Mage",
  ninja: "Ninja",
  professional: "Pro",
};

export function MultiAgentRelay({
  activityState,
  currentAgentName,
  currentWay,
  hasToolExecution,
  isFinished,
  isLoading,
}: MultiAgentRelayProps) {
  // Do not render a permanent activity card for a completed historical message.
  // This component reflects the live response state, not an invented task timeline.
  if (!hasToolExecution || !isLoading || isFinished) return null;

  const agentName = currentAgentName.trim() || "Équipe Idealy";
  const activityLabel =
    activityState === "correcting"
      ? "Corrige un problème détecté"
      : "Construit l’application";
  const wayLabel = wayLabels[currentWay] ?? "Idealy";

  return (
    <div
      aria-label={`${agentName} : ${activityLabel.toLocaleLowerCase("fr")}`}
      aria-live="polite"
      className="my-2 flex w-fit max-w-full items-center gap-2.5 rounded-xl border border-border/70 bg-card/70 px-3 py-2 text-xs text-muted-foreground"
      role="status"
      data-testid="multi-agent-live-status"
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {isLoading ? (
          <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
        ) : (
          <RadioTower aria-hidden="true" className="size-3.5" />
        )}
      </span>
      <span className="min-w-0">
        <span className="font-medium text-foreground">{agentName}</span>
        <span> travaille sur la demande</span>
      </span>
      <span className="shrink-0 rounded-md bg-muted px-1.5 py-1 text-[10px] font-medium">
        {wayLabel}
      </span>
    </div>
  );
}
