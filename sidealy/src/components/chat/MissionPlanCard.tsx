import {
  Check,
  ChevronRight,
  LoaderCircle,
  Rocket,
  TriangleAlert,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useApp } from "../../context/AppContext";
import type { MissionRun } from "../../types";
import { MissionWorkspace } from "./MissionWorkspace";

export const MissionPlanCard: React.FC<{
  mission: MissionRun;
  messageId: string;
}> = ({ mission, messageId }) => {
  const { startMission } = useApp();
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const isBuilding = mission.status === "building";

  return (
    <section
      aria-label="Plan de mission Idéali"
      className="my-4 overflow-hidden rounded-2xl border border-border-subtle bg-bg-surface shadow-subtle"
    >
      <div className="flex items-start justify-between gap-4 border-b border-border-subtle px-4 py-3.5 md:px-5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
            Plan de mission
          </p>
          <h3 className="mt-1 truncate text-[15px] font-semibold text-text-main">
            {mission.plan.projectKind}
          </h3>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            mission.status === "ready"
              ? "bg-success/10 text-success"
              : isBuilding
                ? "bg-brand-primary/10 text-brand-primary"
                : mission.status === "needs-fix"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-bg-base text-text-muted"
          }`}
        >
          {mission.status === "ready" ? (
            <Check aria-hidden="true" className="h-3 w-3" />
          ) : isBuilding ? (
            <LoaderCircle aria-hidden="true" className="h-3 w-3 animate-spin" />
          ) : null}
          {mission.status === "ready"
            ? "Build vérifié"
            : isBuilding
              ? "Construction en cours"
              : mission.status === "needs-fix"
                ? "Correction requise"
                : "À valider"}
        </span>
      </div>

      <div className="space-y-4 px-4 py-4 md:px-5">
        <div>
          <p className="text-[11px] font-medium text-text-muted">Objectif</p>
          <p className="mt-1 text-[13px] leading-5 text-text-main">
            {mission.plan.intention}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-text-muted">
            Périmètre de la première version
          </p>
          <p className="mt-1 text-[13px] leading-5 text-text-main">
            {mission.plan.v1Scope}
          </p>
        </div>
        {mission.plan.agents.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-medium text-text-muted">
              Équipe prévue
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {mission.plan.agents.map((agent, index) => (
                <div
                  className="rounded-xl bg-bg-base px-3 py-2.5"
                  key={`${agent.name}-${index}`}
                >
                  <p className="text-[12px] font-medium text-text-main">
                    {agent.name}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-4 text-text-muted">
                    {agent.responsibility}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {mission.error && (
          <div
            className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-[12px] leading-5 text-text-main"
            role="alert"
          >
            <TriangleAlert
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
            />
            <span>{mission.error}</span>
          </div>
        )}

        {mission.status === "planned" && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-3">
            <p className="text-[11px] text-text-muted">
              La construction démarre uniquement après validation.
            </p>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-full bg-text-main px-3.5 text-[12px] font-medium text-bg-base transition-opacity hover:opacity-85 focus-ring"
              onClick={() => void startMission(mission.id, messageId)}
              type="button"
            >
              <Rocket aria-hidden="true" className="h-3.5 w-3.5" />
              Valider et lancer
              <ChevronRight
                aria-hidden="true"
                className="h-3.5 w-3.5 opacity-70"
              />
            </button>
          </div>
        )}

        {isBuilding && (
          <p className="text-[12px] text-text-muted">
            Le backend exécute la mission et vérifie les fichiers générés. Cette
            étape peut prendre quelques minutes.
          </p>
        )}
        {mission.status === "ready" && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-3">
            <p className="text-[12px] text-text-muted">
              {mission.files?.length ?? 0} fichier(s) chargés depuis l’espace de
              mission.
            </p>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-full bg-text-main px-3.5 text-[12px] font-medium text-bg-base transition-opacity hover:opacity-85 focus-ring"
              onClick={() => setWorkspaceOpen(true)}
              type="button"
            >
              <Rocket aria-hidden="true" className="h-3.5 w-3.5" />
              Ouvrir l’espace de mission
            </button>
          </div>
        )}
        {mission.status === "needs-fix" && (
          <p className="text-[12px] text-text-muted">
            Le backend n’a pas confirmé un build valide. Le statut reste visible
            ici, sans succès simulé.
          </p>
        )}
      </div>
      {workspaceOpen && (
        <MissionWorkspace
          buildVerification={mission.buildVerification}
          initialFiles={mission.files ?? []}
          missionId={mission.id}
          onClose={() => setWorkspaceOpen(false)}
          projectName={mission.plan.projectKind}
        />
      )}
    </section>
  );
};
