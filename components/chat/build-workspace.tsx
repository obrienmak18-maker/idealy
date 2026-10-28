"use client";

import { CheckCircle2, CircleAlert, LoaderCircle, MessageSquareText, PanelLeft, SquareArrowOutUpRight } from "lucide-react";
import { useArtifact } from "@/hooks/use-artifact";
import { cn } from "@/lib/utils";
import { MissionPlanCard } from "./mission-plan-card";

type WorkspacePanel = "plan" | "chat" | "preview";

export function BuildWorkspace({
  activePanel,
  onPanelChange,
}: {
  activePanel: WorkspacePanel;
  onPanelChange: (panel: WorkspacePanel) => void;
}) {
  const { metadata } = useArtifact();
  const missionPlan = metadata?.missionPlan as Record<string, unknown> | null | undefined;
  const missionId = typeof metadata?.missionId === "string" ? metadata.missionId : null;
  const squadStatus = typeof metadata?.missionSquadStatus === "string" ? metadata.missionSquadStatus : null;
  const isRunning = ["building", "reviewing", "auto_correction_started"].includes(squadStatus ?? "");
  const steps = [
    { label: "Comprendre le besoin", done: Boolean(missionPlan) },
    { label: "Valider le plan", done: Boolean(missionPlan) && squadStatus !== "planned" },
    { label: "Construire et vérifier", done: squadStatus === "ready" },
  ];

  return (
    <>
      <nav aria-label="Navigation du workspace" className="flex shrink-0 items-center gap-1 border-b border-border/60 bg-sidebar/70 px-2 py-2 md:hidden">
        {([
          ["plan", "Plan", PanelLeft],
          ["chat", "Chat", MessageSquareText],
          ["preview", "Aperçu", SquareArrowOutUpRight],
        ] as const).map(([panel, label, Icon]) => (
          <button
            key={panel}
            type="button"
            aria-pressed={activePanel === panel}
            onClick={() => onPanelChange(panel)}
            className={cn("inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium transition", activePanel === panel ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/60")}
          >
            <Icon aria-hidden="true" className="size-3.5" />
            {label}
          </button>
        ))}
      </nav>

      <aside aria-label="Plan de construction" className={cn("w-full shrink-0 flex-col border-r border-border/60 bg-sidebar/45 lg:w-[248px]", activePanel === "plan" ? "flex" : "hidden lg:flex")}>
        <div className="border-b border-border/60 px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Workspace Idealy</p>
          <h2 className="mt-1 text-sm font-semibold text-foreground">Plan de construction</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Le plan reste lié aux décisions et événements de cette conversation.</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {missionId && missionPlan ? <MissionPlanCard /> : <div className="rounded-xl border border-dashed border-border/70 bg-background/40 p-3 text-xs leading-5 text-muted-foreground">Le plan apparaîtra ici après la compréhension de votre idée.</div>}
          <div className="mt-4 flex flex-col gap-2 px-1">
            {steps.map((step) => (
              <div key={step.label} className="flex items-start gap-2 text-xs">
                {step.done ? <CheckCircle2 aria-hidden="true" className="mt-0.5 size-3.5 text-emerald-500" /> : isRunning && step.label === "Construire et vérifier" ? <LoaderCircle aria-hidden="true" className="mt-0.5 size-3.5 animate-spin text-primary" /> : <CircleAlert aria-hidden="true" className="mt-0.5 size-3.5 text-muted-foreground/60" />}
                <span className={step.done ? "text-foreground" : "text-muted-foreground"}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

    </>
  );
}
