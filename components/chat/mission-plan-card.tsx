"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Code2,
  LoaderCircle,
  PencilLine,
  Play,
  Save,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useArtifact } from "@/hooks/use-artifact";
import { PowerStatusBadge } from "@/components/chat/power-status";
import { useGamificationStore } from "@/lib/stores/use-gamification-store";
import { useTranslation } from "@/lib/i18n/provider";
import { voiesCatalog } from "@/lib/idealy/voies-catalog";
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
        .filter((agent): agent is Record<string, unknown> => Boolean(agent && typeof agent === "object"))
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
  if (!projectKind || !intention || !v1Scope || !nextStep || agents.length === 0) return null;
  return { agents, intention, nextStep, projectKind, v1Scope };
}

const ACTIVE_STATUSES = new Set(["building", "reviewing", "auto_correction_started"]);

const copy = {
  fr: {
    heading: "Passage de relais",
    ready: "Plan prêt",
    active: "L’escouade travaille",
    reviewing: "Vérification finale",
    correcting: "Amélioration en cours",
    validated: "Mission validée",
    needsInput: "Une décision est requise",
    needsFix: "Une correction est nécessaire",
    planLabel: "Plan de mission",
    goal: "Objectif",
    scope: "Ce qui sera construit",
    next: "Prochaine étape",
    team: "Escouade prévue",
    show: "Voir le plan",
    hide: "Réduire",
    edit: "Modifier",
    cancel: "Annuler",
    save: "Enregistrer",
    saving: "Enregistrement…",
    launch: "Valider et lancer",
    launching: "Préparation de l’escouade…",
    retry: "Relancer l’escouade",
    workspace: "Ouvrir le workspace",
    noRewrite: "Vérifiez le plan ou ajustez-le ici. Aucun nouveau prompt n’est nécessaire.",
    saved: "Plan mis à jour. Vous pouvez lancer la mission.",
    saveError: "Le plan n’a pas pu être enregistré.",
    titleField: "Nom du projet",
    goalField: "Objectif de l’application",
    scopeField: "Périmètre de la première version",
    nextField: "Étape suivante",
    editing: "Ajustez seulement les éléments à modifier. Les informations du compte et l’historique restent inchangés.",
    resourceNote: "Les ressources sont vérifiées pendant l’exécution.",
  },
  en: {
    heading: "Handoff",
    ready: "Plan ready",
    active: "Squad working",
    reviewing: "Final review",
    correcting: "Improving",
    validated: "Mission validated",
    needsInput: "A decision is needed",
    needsFix: "A correction is needed",
    planLabel: "Mission plan",
    goal: "Goal",
    scope: "What will be built",
    next: "Next step",
    team: "Planned squad",
    show: "View plan",
    hide: "Collapse",
    edit: "Edit",
    cancel: "Cancel",
    save: "Save changes",
    saving: "Saving…",
    launch: "Approve and launch",
    launching: "Preparing squad…",
    retry: "Restart squad",
    workspace: "Open workspace",
    noRewrite: "Review or adjust the plan here. No new prompt is needed.",
    saved: "Plan updated. You can launch the mission.",
    saveError: "The plan could not be saved.",
    titleField: "Project name",
    goalField: "App goal",
    scopeField: "First-version scope",
    nextField: "Next step",
    editing: "Only adjust the items that need changing. Your account and history stay untouched.",
    resourceNote: "Resources are checked during execution.",
  },
  es: {
    heading: "Traspaso",
    ready: "Plan listo",
    active: "El equipo está trabajando",
    reviewing: "Revisión final",
    correcting: "Mejoras en curso",
    validated: "Misión validada",
    needsInput: "Se necesita una decisión",
    needsFix: "Se necesita una corrección",
    planLabel: "Plan de misión",
    goal: "Objetivo",
    scope: "Qué se construirá",
    next: "Siguiente paso",
    team: "Equipo previsto",
    show: "Ver el plan",
    hide: "Contraer",
    edit: "Modificar",
    cancel: "Cancelar",
    save: "Guardar cambios",
    saving: "Guardando…",
    launch: "Validar e iniciar",
    launching: "Preparando el equipo…",
    retry: "Reiniciar el equipo",
    workspace: "Abrir workspace",
    noRewrite: "Revisa o ajusta el plan aquí. No necesitas escribir otro prompt.",
    saved: "Plan actualizado. Ya puedes iniciar la misión.",
    saveError: "No se pudo guardar el plan.",
    titleField: "Nombre del proyecto",
    goalField: "Objetivo de la aplicación",
    scopeField: "Alcance de la primera versión",
    nextField: "Siguiente paso",
    editing: "Ajusta solo lo que quieras cambiar. La cuenta y el historial no se modifican.",
    resourceNote: "Los recursos se comprueban durante la ejecución.",
  },
} as const;

export function MissionPlanCard() {
  const { metadata, setArtifact, setMetadata } = useArtifact();
  const { currentWay } = useGamificationStore();
  const { language } = useTranslation();
  const locale = language === "en" || language === "es" ? language : "fr";
  const text = copy[locale];
  const activeWayData = voiesCatalog[currentWay] ?? voiesCatalog.ninja;
  const runtimeAgents = activeWayData.agents;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const missionId = typeof metadata?.missionId === "string" ? metadata.missionId : null;
  const plan = useMemo(() => parseMissionPlan(metadata?.missionPlan), [metadata?.missionPlan]);
  const [draftPlan, setDraftPlan] = useState<MissionPlanView | null>(plan);
  const status = typeof metadata?.missionSquadStatus === "string" ? metadata.missionSquadStatus : "planned";
  const isActive = ACTIVE_STATUSES.has(status);
  const isValidated = status === "ready";
  const needsUserInput = status === "needs-user-input";
  const failed = status === "needs-fix";
  const requestAlreadyQueued = metadata?.missionRunRequested === true;
  const locked = isActive || isValidated || requestAlreadyQueued;

  useEffect(() => {
    setDraftPlan(plan);
  }, [plan]);

  useEffect(() => {
    if (isActive || isValidated || failed || needsUserInput || !requestAlreadyQueued) {
      setIsSubmitting(false);
    }
  }, [failed, isActive, isValidated, needsUserInput, requestAlreadyQueued]);

  if (!missionId || !plan) return null;

  function openWorkspace(view: "preview" | "code" = "preview") {
    setArtifact((current) => ({
      ...current,
      isVisible: true,
      kind: "code",
      status: "idle",
      title: plan?.projectKind || current.title || "Mission workspace",
    }));
    setMetadata((current: Record<string, unknown> | null) => ({ ...(current ?? {}), activeTab: view }));
    window.setTimeout(() => window.dispatchEvent(new CustomEvent("idealy:set-view", { detail: view })), 0);
  }

  function beginEditing() {
    setDraftPlan(plan);
    setIsExpanded(true);
    setIsEditing(true);
  }

  function cancelEditing() {
    setDraftPlan(plan);
    setIsEditing(false);
  }

  async function savePlan() {
    if (!missionId || !draftPlan || isSaving || locked) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/idealy/missions/${missionId}/plan`, {
        method: "PATCH",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: draftPlan }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; plan?: MissionPlanView } | null;
      if (!response.ok || !payload?.plan) {
        throw new Error(payload?.error ?? text.saveError);
      }
      setMetadata((current: Record<string, unknown> | null) => ({
        ...(current ?? {}),
        missionPlan: payload.plan,
      }));
      setIsEditing(false);
      toast.success(text.saved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text.saveError);
    } finally {
      setIsSaving(false);
    }
  }

  function handleLaunch() {
    if (isSubmitting || isActive || requestAlreadyQueued || isValidated || needsUserInput || isEditing || isSaving) return;
    setIsSubmitting(true);
    openWorkspace("code");
    setMetadata((current: Record<string, unknown> | null) => ({
      ...(current ?? {}),
      missionRunRequested: true,
      missionSquadError: null,
    }));
  }

  const statusText = isValidated
    ? text.validated
    : isActive
      ? status === "reviewing"
        ? text.reviewing
        : status === "auto_correction_started"
          ? text.correcting
          : text.active
      : needsUserInput
        ? text.needsInput
        : failed
          ? text.needsFix
          : text.ready;

  const buttonLabel = isActive || isSubmitting || requestAlreadyQueued
    ? text.launching
    : failed
      ? text.retry
      : text.launch;

  function updateDraft<K extends keyof MissionPlanView>(key: K, value: MissionPlanView[K]) {
    setDraftPlan((current) => current ? { ...current, [key]: value } : current);
  }

  return (
    <motion.section
      aria-label={text.planLabel}
      className="my-3 w-full max-w-2xl overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"
      data-testid="mission-plan-card"
      layout
    >
      <div className="flex items-start justify-between gap-3 px-3.5 py-3 sm:px-4">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UsersRound aria-hidden="true" className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{text.heading}</p>
            <h3 className="mt-0.5 truncate text-sm font-semibold leading-5 text-foreground">{plan.projectKind}</h3>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{plan.intention}</p>
          </div>
        </div>
        <span aria-live="polite" className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-medium",
          isValidated
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
            : failed || needsUserInput
              ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              : "border-border/70 bg-muted/40 text-muted-foreground",
        )}>
          {isValidated ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> :
            isActive || isSubmitting || requestAlreadyQueued ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> :
              <CircleAlert className="size-3.5" aria-hidden="true" />}
          {statusText}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 px-3.5 pb-3 sm:px-4">
        {runtimeAgents.map((agent) => (
          <span key={agent.name} className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/50 px-2 py-1 text-[10px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary/60" />
            <span className="font-medium text-foreground/80">{agent.name}</span>
            <span className="hidden sm:inline">{agent.isChief ? (locale === "en" ? "Lead" : locale === "es" ? "Líder" : "Chef") : agent.role.split(/[&/]/)[0].trim()}</span>
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-muted/15 px-3.5 py-2.5 sm:px-4">
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((current) => !current)}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted-foreground transition hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronDown className={cn("size-3.5 transition-transform", isExpanded && "rotate-180")} />
          {isExpanded ? text.hide : text.show}
        </button>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!locked && !isEditing ? (
            <button type="button" onClick={beginEditing} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-border/70 bg-background px-2.5 text-xs font-medium text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <PencilLine className="size-3.5" /> {text.edit}
            </button>
          ) : null}
          {isValidated ? null : needsUserInput ? (
            <span className="max-w-56 text-xs text-amber-700 dark:text-amber-300" role="status">{text.needsInput}</span>
          ) : (
            <button
              type="button"
              disabled={locked || isEditing || isSaving}
              onClick={handleLaunch}
              className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {locked ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
              {buttonLabel}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            key="plan-details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {!isEditing ? (
              <div className="space-y-3 border-t border-border/60 px-3.5 py-3.5 sm:px-4">
                <div>
                  <p className="text-xs font-semibold text-foreground">{text.scope}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{plan.v1Scope}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{text.next}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{plan.nextStep}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {plan.agents.map((work, index) => (
                    <div key={work.name + work.responsibility + index} className="rounded-xl border border-border/50 bg-background/50 p-3">
                      <p className="text-xs font-semibold text-foreground">{work.responsibility}</p>
                      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{work.result}</p>
                    </div>
                  ))}
                </div>
                {typeof metadata?.missionSquadError === "string" && (failed || needsUserInput) ? (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs leading-5 text-amber-700 dark:text-amber-300" role="status">{metadata.missionSquadError}</p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3 border-t border-border/60 px-3.5 py-3.5 sm:px-4">
                <p className="text-xs leading-5 text-muted-foreground">{text.noRewrite} {text.editing}</p>
                {([
                  ["projectKind", text.titleField],
                  ["intention", text.goalField],
                  ["v1Scope", text.scopeField],
                  ["nextStep", text.nextField],
                ] as const).map(([key, label]) => (
                  <label key={key} className="block space-y-1.5">
                    <span className="text-xs font-medium text-foreground">{label}</span>
                    <textarea
                      rows={key === "projectKind" ? 1 : 3}
                      maxLength={2400}
                      value={draftPlan?.[key] ?? ""}
                      onChange={(event) => updateDraft(key, event.target.value as MissionPlanView[typeof key])}
                      className="w-full resize-y rounded-xl border border-border/70 bg-background px-3 py-2.5 text-sm leading-5 text-foreground outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                    />
                  </label>
                ))}
                <div className="flex flex-wrap justify-end gap-2 border-t border-border/50 pt-3">
                  <button type="button" onClick={cancelEditing} disabled={isSaving} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-50">
                    <X className="size-3.5" /> {text.cancel}
                  </button>
                  <button type="button" onClick={() => void savePlan()} disabled={isSaving || locked || !draftPlan} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
                    {isSaving ? <LoaderCircle className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} {isSaving ? text.saving : text.save}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex items-center justify-between gap-2 border-t border-border/50 px-3.5 py-2 sm:px-4">
        <div className="min-w-0">
          <PowerStatusBadge action="mission_squad" />
          <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{text.resourceNote}</p>
        </div>
        <button
          type="button"
          onClick={() => openWorkspace("preview")}
          className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Code2 className="size-3.5" /> {text.workspace}
        </button>
      </div>
    </motion.section>
  );
}
