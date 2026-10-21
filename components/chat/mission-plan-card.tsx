"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Code2,
  LoaderCircle,
  Play,
  UsersRound,
} from "lucide-react";
import { useArtifact } from "@/hooks/use-artifact";
import { PowerStatusBadge } from "@/components/chat/power-status";
import { cn } from "@/lib/utils";

type PlanAgent = {
  name: string;
  responsibility: string;
  result: string;
};

type MissionPlanView = {
  agents: PlanAgent[];
  intention: string;
  nextStep: string;
  projectKind: string;
  v1Scope: string;
};

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseMissionPlan(value: unknown): MissionPlanView | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const agents = Array.isArray(raw.agents)
    ? raw.agents
        .filter((agent): agent is Record<string, unknown> => {
          return Boolean(agent && typeof agent === "object");
        })
        .map((agent) => ({
          name: nonEmptyString(agent.name) ?? "",
          responsibility: nonEmptyString(agent.responsibility) ?? "",
          result: nonEmptyString(agent.result) ?? "",
        }))
        .filter((agent) => agent.name && agent.responsibility && agent.result)
        .slice(0, 6)
    : [];

  const projectKind = nonEmptyString(raw.projectKind);
  const intention = nonEmptyString(raw.intention);
  const v1Scope = nonEmptyString(raw.v1Scope);
  const nextStep = nonEmptyString(raw.nextStep);
  if (!projectKind || !intention || !v1Scope || !nextStep || agents.length === 0) {
    return null;
  }

  return { agents, intention, nextStep, projectKind, v1Scope };
}

const ACTIVE_STATUSES = new Set([
  "building",
  "reviewing",
  "auto_correction_started",
]);

export function MissionPlanCard() {
  const { artifact, metadata, setArtifact, setMetadata } = useArtifact();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const missionId =
    typeof metadata?.missionId === "string" ? metadata.missionId : null;
  const plan = useMemo(
    () => parseMissionPlan(metadata?.missionPlan),
    [metadata?.missionPlan]
  );
  const status =
    typeof metadata?.missionSquadStatus === "string"
      ? metadata.missionSquadStatus
      : "planned";
  const isActive = ACTIVE_STATUSES.has(status);
  const isValidated = status === "ready";
  const requestAlreadyQueued = metadata?.missionRunRequested === true;

  useEffect(() => {
    if (isActive || isValidated || status === "needs-fix" || status === "needs-user-input") {
      setIsSubmitting(false);
    } else if (!requestAlreadyQueued) {
      setIsSubmitting(false);
    }
  }, [isActive, isValidated, requestAlreadyQueued, status]);

  if (!missionId || !plan) return null;
  const missionPlan = plan;

  function openWorkspace() {
    setArtifact((current) => ({
      ...current,
      isVisible: true,
      kind: "code",
      status: "idle",
      title: missionPlan.projectKind || current.title || "Mission workspace",
    }));
    setMetadata((current: Record<string, unknown> | null) => ({
      ...(current ?? {}),
      activeTab: "preview",
    }));
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("idealy:set-view", { detail: "preview" }));
    }, 0);
  }

  function handleLaunch() {
    if (isSubmitting || isActive || requestAlreadyQueued || isValidated) return;
    setIsSubmitting(true);
    openWorkspace();
    setMetadata((current: Record<string, unknown> | null) => ({
      ...(current ?? {}),
      missionRunRequested: true,
      missionSquadError: null,
    }));
  }

  const failed = status === "needs-fix" || status === "needs-user-input";
  const statusText = isValidated
    ? "Mission validée"
    : isActive
      ? status === "reviewing"
        ? "Vérification en cours"
        : status === "auto_correction_started"
          ? "Correction en cours"
          : "Construction en cours"
      : failed
        ? "Une vérification reste nécessaire"
        : "Plan prêt à valider";

  return (
    <section
      aria-label="Plan de mission Idealy"
      className="my-3 w-full max-w-2xl overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"
      data-testid="mission-plan-card"
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3.5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UsersRound aria-hidden="true" className="size-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Plan de mission
            </p>
            <h3 className="mt-1 text-sm font-semibold leading-5 text-foreground">
              {missionPlan.projectKind}
            </h3>
          </div>
        </div>
        <span
          aria-live="polite"
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium",
            isValidated
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
              : failed
                ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300"
                : "border-border/70 bg-muted/40 text-muted-foreground"
          )}
        >
          {isValidated ? (
            <CheckCircle2 aria-hidden="true" className="size-3.5" />
          ) : isActive || isSubmitting || requestAlreadyQueued ? (
            <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
          ) : failed ? (
            <CircleAlert aria-hidden="true" className="size-3.5" />
          ) : (
            <CircleAlert aria-hidden="true" className="size-3.5" />
          )}
          {statusText}
        </span>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div>
          <p className="text-xs font-semibold text-foreground">Objectif</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{missionPlan.intention}</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/60 p-3">
          <p className="text-xs font-semibold text-foreground">Périmètre de la première version</p>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{missionPlan.v1Scope}</p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-foreground">Escouade assignée</p>
            <span className="text-[10px] text-muted-foreground">
              {missionPlan.agents.length} agents
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {missionPlan.agents.map((agent) => (
              <div
                className="rounded-xl border border-border/60 bg-background/50 p-3"
                key={agent.name}
              >
                <p className="text-xs font-semibold text-foreground">{agent.name}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {agent.responsibility}
                </p>
                <p className="mt-2 text-[11px] leading-5 text-foreground/80">
                  <span className="font-medium">Livrable : </span>{agent.result}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-foreground">Prochaine étape</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{missionPlan.nextStep}</p>
        </div>

        {failed && typeof metadata?.missionSquadError === "string" ? (
          <p
            aria-live="polite"
            className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs leading-5 text-amber-700 dark:text-amber-300"
            role="status"
          >
            {metadata.missionSquadError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 border-t border-border/60 bg-muted/20 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <PowerStatusBadge action="mission_squad" />
          <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
            Le solde est actualisé depuis le backend pendant la mission.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border/70 bg-background px-3.5 py-2 text-xs font-medium text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={openWorkspace}
            type="button"
          >
            <Code2 aria-hidden="true" className="size-3.5" />
            Ouvrir le workspace
          </button>
          {isValidated ? null : (
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              disabled={isActive || isSubmitting || requestAlreadyQueued}
              onClick={handleLaunch}
              type="button"
            >
              {isActive || isSubmitting || requestAlreadyQueued ? (
                <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
              ) : (
                <Play aria-hidden="true" className="size-3.5" />
              )}
              {isActive || isSubmitting || requestAlreadyQueued
                ? "Escouade en cours…"
                : failed
                  ? "Relancer l’escouade"
                  : "Valider et lancer"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
