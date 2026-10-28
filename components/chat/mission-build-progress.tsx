"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  FileCode2,
  LoaderCircle,
  ListChecks,
} from "lucide-react";
import { useArtifact } from "@/hooks/use-artifact";
import { cn } from "@/lib/utils";

type MissionEvent = {
  created_at?: string;
  event_type: string;
  id?: string;
  mission_id?: string;
  path?: string | null;
  payload?: Record<string, unknown>;
  sequence: number;
};

type EventPayload = {
  events?: MissionEvent[];
  lastSequence?: number;
};

type StepStatus = "running" | "completed" | "failed";

type ProgressStep = {
  id: string;
  detail?: string;
  label: string;
  sequence: number;
  status: StepStatus;
  kind: "agent" | "file" | "build" | "validation" | "other";
};

const ACTIVE_STATUSES = new Set([
  "building",
  "reviewing",
  "auto_correction_started",
]);

const FILE_REFRESH_EVENTS = new Set([
  "file_started",
  "file_content",
  "file_saved",
  "build_log",
  "validation_result",
  "mission_completed",
]);

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numericValue(value: unknown, fallback = 1): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function eventStatus(value: unknown): StepStatus {
  if (value === "passed" || value === "ready" || value === "success" || value === "completed") {
    return "completed";
  }
  if (value === "failed" || value === "needs-fix" || value === "blocked") {
    return "failed";
  }
  return "running";
}

function buildProgressSteps(events: MissionEvent[]): ProgressStep[] {
  const agents = new Map<string, ProgressStep>();
  const files = new Map<string, ProgressStep>();
  let buildStep: ProgressStep | null = null;
  let validationStep: ProgressStep | null = null;
  let correctionStep: ProgressStep | null = null;
  let missionStarted: ProgressStep | null = null;

  for (const event of [...events].sort((a, b) => a.sequence - b.sequence)) {
    const payload = event.payload ?? {};
    const type = event.event_type;
    const sequence = event.sequence;
    const agentName = asText(payload.agentName) || asText(payload.agent_name) || asText(payload.agent);
    const agentRole = asText(payload.agentRole) || asText(payload.agent_role);
    const iteration = numericValue(payload.iteration, 1);

    if (type === "mission_started") {
      missionStarted = {
        id: "mission-started",
        label: "Mission lancée",
        detail: "Le backend a commencé l’exécution du plan approuvé.",
        sequence,
        status: "completed",
        kind: "other",
      };
    }

    if (type === "agent_started" || type === "agent_completed" || type === "agent_failed") {
      const key = `${agentName || "agent"}:${iteration}`;
      const status: StepStatus =
        type === "agent_completed" ? "completed" :
        type === "agent_failed" ? "failed" : "running";
      agents.set(key, {
        id: `agent:${key}`,
        label: agentName ? `${agentName} travaille` : "Agent en cours",
        detail: [agentRole, iteration > 1 ? `Itération ${iteration}` : ""].filter(Boolean).join(" · ") || undefined,
        sequence,
        status,
        kind: "agent",
      });
    }

    if (type === "file_started" || type === "file_content" || type === "file_saved") {
      const path = asText(event.path) || asText(payload.path);
      if (path) {
        const status: StepStatus = type === "file_saved" ? "completed" : "running";
        files.set(path, {
          id: `file:${path}`,
          label: path,
          detail: type === "file_saved" ? "Fichier enregistré dans le workspace" : "Écriture du fichier en cours",
          sequence,
          status,
          kind: "file",
        });
      }
    }

    if (type === "auto_correction_started") {
      correctionStep = {
        id: "auto-correction",
        label: "Correction automatique",
        detail: "Le backend a détecté des points à corriger et a relancé le constructeur.",
        sequence,
        status: "running",
        kind: "other",
      };
    }

    if (type === "validation_result") {
      const rawStatus = asText(payload.status);
      validationStep = {
        id: "validation",
        label: "Vérification des livrables",
        detail: rawStatus === "passed"
          ? "La vérification a validé les contrôles annoncés par le backend."
          : rawStatus === "needs-fix"
            ? "La vérification a relevé un point à corriger."
            : "Le backend examine la structure du projet.",
        sequence,
        status: eventStatus(rawStatus),
        kind: "validation",
      };
    }

    if (type === "build_log") {
      const message = asText(payload.message);
      const buildStatus = asText(payload.buildStatus) || asText(payload.status);
      if (buildStatus || /npm install|npm run build|compilation réelle/i.test(message)) {
        buildStep = {
          id: "build",
          label: "Compilation réelle",
          detail: message || (buildStatus === "passed"
            ? "La compilation a réussi."
            : buildStatus === "failed"
              ? "La compilation n’a pas abouti."
              : "npm install puis npm run build"),
          sequence,
          status: eventStatus(buildStatus || "building"),
          kind: "build",
        };
      }
    }

    if (type === "mission_completed" && payload.source === "post-squad-build-verification") {
      const buildStatus = asText(payload.buildVerificationStatus);
      buildStep = {
        id: "build",
        label: "Compilation réelle",
        detail: buildStatus === "passed"
          ? "npm install et npm run build ont réussi."
          : "La compilation réelle n’a pas réussi. Consultez le détail du build.",
        sequence,
        status: eventStatus(buildStatus),
        kind: "build",
      };
      if (correctionStep?.status === "running") {
        correctionStep = { ...correctionStep, sequence, status: "completed" };
      }
    }
  }

  return [
    ...(missionStarted ? [missionStarted] : []),
    ...agents.values(),
    ...files.values(),
    ...(correctionStep ? [correctionStep] : []),
    ...(validationStep ? [validationStep] : []),
    ...(buildStep ? [buildStep] : []),
  ].sort((a, b) => b.sequence - a.sequence);
}

async function fetchProgress(url: string): Promise<EventPayload> {
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!response.ok) {
    throw new Error(response.status === 401
      ? "La session a expiré. Reconnectez-vous pour suivre la mission."
      : "Les événements de la mission ne sont pas accessibles pour le moment.");
  }
  return (await response.json()) as EventPayload;
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "completed") {
    return <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />;
  }
  if (status === "failed") {
    return <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-rose-600 dark:text-rose-400" />;
  }
  return <LoaderCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" />;
}

export function MissionBuildProgress({
  missionId,
  status,
}: {
  missionId: string;
  status: string;
}) {
  const { metadata, setMetadata } = useArtifact();
  const isActive = ACTIVE_STATUSES.has(status);
  const [cursor, setCursor] = useState(0);
  const [events, setEvents] = useState<MissionEvent[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const eventsKey = missionId && process.env.NEXT_PUBLIC_DEMO_MODE !== "true"
    ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/idealy/missions/${encodeURIComponent(missionId)}/events?afterSequence=${cursor}&eventsOnly=true`
    : null;

  const { data, error, isLoading } = useSWR<EventPayload>(
    eventsKey,
    fetchProgress,
    {
      refreshInterval: isActive ? 1400 : 0,
      revalidateOnFocus: true,
      shouldRetryOnError: false,
      keepPreviousData: true,
    }
  );

  useEffect(() => {
    if (!data) return;
    const incoming = Array.isArray(data.events) ? data.events : [];
    if (incoming.length) {
      setEvents((current) => {
        const merged = new Map(current.map((event) => [event.sequence, event]));
        for (const event of incoming) merged.set(event.sequence, event);
        return [...merged.values()].sort((a, b) => a.sequence - b.sequence);
      });
    }
    const latestSequence = Math.max(
      Number(data.lastSequence ?? 0),
      ...incoming.map((event) => event.sequence),
      cursor,
    );
    if (latestSequence > cursor) setCursor(latestSequence);

    const fileRefreshSequence = incoming
      .filter((event) => FILE_REFRESH_EVENTS.has(event.event_type))
      .reduce((highest, event) => Math.max(highest, event.sequence), 0);

    if (fileRefreshSequence > 0) {
      setMetadata((current: Record<string, unknown> | null) => {
        if (current?.missionId !== missionId) return current;
        const previousSequence = Number(current?.missionFileLastSequence ?? 0);
        if (previousSequence >= fileRefreshSequence) return current;
        return {
          ...(current ?? {}),
          missionFileLastSequence: fileRefreshSequence,
        };
      });
    }
  }, [cursor, data, missionId, setMetadata]);

  const steps = useMemo(() => buildProgressSteps(events), [events]);
  const completedCount = steps.filter((step) => step.status === "completed").length;
  const failedCount = steps.filter((step) => step.status === "failed").length;
  const savedFileCount = steps.filter((step) => step.kind === "file" && step.status === "completed").length;
  const visibleSteps = showAll ? steps : steps.slice(0, 6);
  const isFinished = status === "ready" || status === "needs-fix" || status === "needs-user-input";
  const heading = status === "ready"
    ? "Application compilée et vérifiée"
    : status === "needs-fix"
      ? "La génération nécessite une correction"
      : status === "needs-user-input"
        ? "Une décision est nécessaire"
        : status === "reviewing"
          ? "Vérification de l’application"
          : status === "auto_correction_started"
            ? "Correction de l’application"
            : "Construction de l’application";

  useEffect(() => {
    if (isFinished) setExpanded(true);
  }, [isFinished]);

  return (
    <section
      aria-label="Progression réelle de la mission"
      className="mx-auto my-3 w-full max-w-3xl border-y border-border/50 py-3"
      data-testid="mission-build-progress"
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
          <ListChecks aria-hidden="true" className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">{heading}</h3>
            {!isFinished ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                En cours
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
            {events.length
              ? `${completedCount} étape${completedCount === 1 ? "" : "s"} terminée${completedCount === 1 ? "" : "s"} · ${savedFileCount} fichier${savedFileCount === 1 ? "" : "s"} enregistré${savedFileCount === 1 ? "" : "s"}${failedCount ? ` · ${failedCount} en échec` : ""}`
              : isLoading
                ? "Connexion au journal de mission…"
                : "En attente du premier événement enregistré par le backend…"}
          </p>
        </div>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? "Réduire" : "Détails"}
          <ChevronDown aria-hidden="true" className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
        </button>
      </div>

      {expanded ? (
        <div className="ml-[38px] mt-3 space-y-2.5">
          {visibleSteps.map((step) => (
            <div key={step.id} className="flex min-w-0 items-start gap-2.5">
              <StepIcon status={step.status} />
              <div className="min-w-0 flex-1">
                <p className={cn(
                  "break-words text-xs leading-5",
                  step.status === "completed" ? "text-foreground/85" : "text-foreground"
                )}>
                  {step.label}
                </p>
                {step.detail ? (
                  <p className="mt-0.5 break-words text-[11px] leading-4 text-muted-foreground">{step.detail}</p>
                ) : null}
              </div>
              {step.kind === "file" ? (
                <FileCode2 aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/70" />
              ) : null}
            </div>
          ))}

          {events.length === 0 && !error ? (
            <p className="text-[11px] leading-5 text-muted-foreground">
              Les étapes apparaîtront ici lorsqu’elles seront confirmées par le journal de mission. Aucun agent n’est marqué comme terminé sans événement correspondant.
            </p>
          ) : null}

          {steps.length > 6 ? (
            <button
              type="button"
              onClick={() => setShowAll((value) => !value)}
              className="ml-6 inline-flex items-center rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
            >
              {showAll ? "Afficher moins" : `Afficher les ${steps.length - 6} autres étapes`}
            </button>
          ) : null}

          {error ? (
            <p className="rounded-md bg-muted/50 px-3 py-2 text-[11px] leading-5 text-muted-foreground" role="status">
              {error instanceof Error ? error.message : "La synchronisation du journal est interrompue."}
            </p>
          ) : null}

          {typeof metadata?.missionSquadError === "string" && isFinished && status !== "ready" ? (
            <p className="rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[11px] leading-5 text-amber-800 dark:text-amber-200" role="status">
              {metadata.missionSquadError}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
