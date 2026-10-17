"use client";

import { CheckCircle2, Circle, Code2, ListChecks, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";
import { useArtifact } from "@/hooks/use-artifact";
import { cn } from "@/lib/utils";

export type PlanStep = {
  id: string | number;
  label: string;
  completed?: boolean;
};

export type ActionPlanCardProps = {
  title?: string;
  steps?: PlanStep[];
  onApply?: () => void;
  onViewCode?: () => void;
  className?: string;
};

const defaultSteps: PlanStep[] = [
  { id: 1, label: "Design du layout et hiérarchie visuelle", completed: true },
  { id: 2, label: "Composants principaux et interactions", completed: true },
  { id: 3, label: "Mode sombre / clair et design tokens", completed: true },
  { id: 4, label: "Intégration, données et optimisation", completed: true },
];

export function ActionPlanCard({
  title = "Plan d'action",
  steps = defaultSteps,
  onApply,
  onViewCode,
  className,
}: ActionPlanCardProps) {
  const { setArtifact, setMetadata } = useArtifact();
  const [completedSteps, setCompletedSteps] = useState<Record<string | number, boolean>>(() => {
    const initial: Record<string | number, boolean> = {};
    for (const step of steps) {
      initial[step.id] = step.completed ?? true;
    }
    return initial;
  });

  const toggleStep = useCallback((id: string | number) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const handleViewCode = useCallback(() => {
    if (onViewCode) {
      onViewCode();
      return;
    }
    setMetadata((prev: any) => ({ ...(prev ?? {}), activeTab: "code" }));
    setArtifact((prev) => ({ ...prev, isVisible: true }));
  }, [onViewCode, setArtifact, setMetadata]);

  const handleApply = useCallback(() => {
    if (onApply) {
      onApply();
      return;
    }
    setMetadata((prev: any) => ({ ...(prev ?? {}), activeTab: "preview" }));
    setArtifact((prev) => ({ ...prev, isVisible: true }));
  }, [onApply, setArtifact, setMetadata]);

  const totalSteps = steps.length;
  const completedCount = Object.values(completedSteps).filter(Boolean).length;

  return (
    <div
      className={cn(
        "my-3 w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-card/40 p-4 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.37)] ring-1 ring-white/10 transition-all duration-300 hover:border-violet-500/40 hover:shadow-[0_12px_36px_rgba(139,92,246,0.18)]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-400">
            <ListChecks className="size-4" />
          </div>
          <div>
            <h4 className="text-[13px] font-semibold text-foreground tracking-tight">
              {title}
            </h4>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-medium text-violet-300">
          <Sparkles className="size-3 text-violet-400" />
          {completedCount}/{totalSteps} étapes
        </span>
      </div>

      {/* Steps List */}
      <div className="flex flex-col gap-2 py-3">
        {steps.map((step) => {
          const isDone = completedSteps[step.id] ?? false;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => toggleStep(step.id)}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/5 cursor-pointer group"
            >
              {isDone ? (
                <CheckCircle2 className="size-4 shrink-0 text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)] transition-transform group-hover:scale-110" />
              ) : (
                <Circle className="size-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:scale-110" />
              )}
              <span
                className={cn(
                  "text-xs leading-relaxed transition-colors",
                  isDone
                    ? "text-foreground/90 font-medium"
                    : "text-muted-foreground line-through opacity-60"
                )}
              >
                {step.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Action Buttons Bar */}
      <div className="mt-1 pt-3 border-t border-border/30 flex items-center gap-2">
        <button
          type="button"
          onClick={handleApply}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md transition-all duration-200 hover:opacity-95 hover:shadow-[0_0_20px_rgba(99,102,241,0.35)] cursor-pointer active:scale-[0.99]"
        >
          <Sparkles className="size-3.5" />
          Appliquer les modifications
        </button>
        <button
          type="button"
          onClick={handleViewCode}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-foreground/80 backdrop-blur-md transition-all duration-200 hover:bg-white/10 hover:text-foreground cursor-pointer"
        >
          <Code2 className="size-3.5 text-muted-foreground" />
          Voir le code
        </button>
      </div>
    </div>
  );
}
