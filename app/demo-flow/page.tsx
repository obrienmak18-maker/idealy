"use client";

import {
  ArrowRightIcon,
  BriefcaseBusinessIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  Code2Icon,
  CrosshairIcon,
  DatabaseIcon,
  EyeIcon,
  FileCode2Icon,
  FolderKanbanIcon,
  LayoutDashboardIcon,
  MonitorIcon,
  PanelRightIcon,
  PlayIcon,
  RefreshCwIcon,
  RocketIcon,
  SparklesIcon,
  SmartphoneIcon,
  TabletIcon,
  TelescopeIcon,
  TerminalSquareIcon,
  UsersRoundIcon,
  WandSparklesIcon,
  XIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { IdealyLogo } from "@/components/branding/idealy-logo";
import {
  demoMissionSteps,
  demoPaths,
  getDemoPath,
  type DemoPathId,
} from "@/lib/idealy/demo-program";
import { cn } from "@/lib/utils";

type WorkspaceView = "preview" | "code" | "data" | "console";
type PreviewPage = "home" | "plan" | "moment";

const demoPrompt =
  "Crée un espace de coaching créatif qui aide une personne à choisir une idée, construire son plan et célébrer chaque progrès.";

const pathIcons = {
  briefcase: BriefcaseBusinessIcon,
  crosshair: CrosshairIcon,
  sparkles: SparklesIcon,
  telescope: TelescopeIcon,
};

const codeFiles = [
  "app/page.tsx",
  "components/MissionCard.tsx",
  "components/ProgressRing.tsx",
  "lib/mission.ts",
];

function progressForStep(step: number) {
  if (step >= demoMissionSteps.length) {
    return 100;
  }
  return step === 0 ? 0 : Math.min(100, 15 + step * 21);
}

export default function DemoFlowPage() {
  const [pathId, setPathId] = useState<DemoPathId>("ninja");
  const [mission, setMission] = useState(demoPrompt);
  const [stepIndex, setStepIndex] = useState(0);
  const [activeView, setActiveView] = useState<WorkspaceView>("preview");
  const [previewPage, setPreviewPage] = useState<PreviewPage>("home");
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">(
    "desktop"
  );
  const [isCanvasOpen, setIsCanvasOpen] = useState(true);
  const [isCanvasExpanded, setIsCanvasExpanded] = useState(false);
  const [showRoster, setShowRoster] = useState(true);
  const [selectedFile, setSelectedFile] = useState(codeFiles[0]);

  const path = getDemoPath(pathId);
  const progress = progressForStep(stepIndex);
  const isCompleted = stepIndex >= demoMissionSteps.length;
  const currentStep = demoMissionSteps[Math.min(stepIndex, demoMissionSteps.length - 1)];
  const activeAgent = path.agents[currentStep?.agentIndex ?? 0];
  const PathIcon = pathIcons[path.icon];

  const timeline = useMemo(
    () =>
      demoMissionSteps.slice(0, stepIndex).map((step) => ({
        ...step,
        agent: path.agents[step.agentIndex],
      })),
    [path.agents, stepIndex]
  );

  const advanceMission = () => {
    setIsCanvasOpen(true);
    setIsCanvasExpanded(false);
    setActiveView(stepIndex >= 2 ? "preview" : "code");
    setStepIndex((current) => Math.min(demoMissionSteps.length, current + 1));
  };

  const restartMission = () => {
    setStepIndex(0);
    setActiveView("preview");
    setPreviewPage("home");
    setIsCanvasOpen(true);
    setIsCanvasExpanded(false);
  };

  return (
    <main className="idealy-app-background min-h-dvh bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-28 top-12 size-96 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute right-[14%] top-[8%] size-[26rem] rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-[38%] size-96 rounded-full bg-orange-400/10 blur-3xl" />
      </div>

      <header className="relative z-10 flex min-h-16 items-center justify-between border-b border-border/50 bg-sidebar/85 px-4 backdrop-blur-xl md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <IdealyLogo animated className="shrink-0" size={28} />
          <span className="hidden h-5 w-px bg-border sm:block" />
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              Démo guidée
            </p>
            <p className="truncate text-sm font-semibold">Mission créative multi-agents</p>
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <div className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
            <span className="mr-1.5 inline-block size-1.5 animate-pulse rounded-full bg-amber-400" />
            Mode démonstration
          </div>
          <button
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={restartMission}
            type="button"
          >
            Recommencer
          </button>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex max-w-[1800px] flex-col gap-4 px-3 py-3 lg:h-[calc(100dvh-4rem)] lg:flex-row lg:px-4 lg:py-4">
        <aside
          className={cn(
            "flex min-w-0 shrink-0 flex-col overflow-hidden rounded-2xl border border-border/55 bg-sidebar/85 shadow-[var(--shadow-card)] backdrop-blur-xl",
            isCanvasExpanded ? "lg:hidden" : "lg:w-[370px]"
          )}
        >
          <div className="border-b border-border/55 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
                    path.accent
                  )}
                >
                  <PathIcon className="size-4" />
                </span>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Votre progression
                  </p>
                  <p className="text-sm font-semibold">{path.name}</p>
                </div>
              </div>
              <span className="rounded-full bg-background px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm ring-1 ring-border/70">
                {progress}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-background/90 ring-1 ring-border/50">
              <div
                className={cn(
                  "h-full rounded-full bg-gradient-to-r transition-[width] duration-500 ease-out",
                  path.accent
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {isCompleted
                ? `${path.reward}. Votre première version est prête à explorer.`
                : path.objective}
            </p>
          </div>

          <div className="border-b border-border/55 p-3">
            <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Choisir une voie
            </p>
            <div className="grid grid-cols-2 gap-2">
              {demoPaths.map((candidate) => {
                const CandidateIcon = pathIcons[candidate.icon];
                const isSelected = candidate.id === path.id;
                return (
                  <button
                    className={cn(
                      "group rounded-xl border p-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected
                        ? "border-transparent bg-gradient-to-br shadow-sm"
                        : "border-border/65 bg-background/65 hover:border-foreground/20 hover:bg-muted/65",
                      isSelected && candidate.accent
                    )}
                    key={candidate.id}
                    onClick={() => {
                      setPathId(candidate.id);
                      restartMission();
                    }}
                    type="button"
                  >
                    <CandidateIcon
                      className={cn(
                        "mb-2 size-4",
                        isSelected ? "text-white" : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    <span
                      className={cn(
                        "block text-xs font-semibold",
                        isSelected ? "text-white" : "text-foreground"
                      )}
                    >
                      {candidate.name.replace("Voie ", "")}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 block text-[10px] leading-4",
                        isSelected ? "text-white/75" : "text-muted-foreground"
                      )}
                    >
                      {candidate.reward.split(" · ")[1]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Équipe de mission
              </p>
              <button
                aria-expanded={showRoster}
                className="rounded-md px-2 py-1 text-[11px] font-medium text-primary transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setShowRoster((value) => !value)}
                type="button"
              >
                {showRoster ? "Réduire" : "Voir les agents"}
              </button>
            </div>

            {showRoster ? (
              <div className="space-y-2">
                {path.agents.map((agent, index) => {
                  const isActive = !isCompleted && index === currentStep.agentIndex;
                  const wasActive = timeline.some(
                    (entry) => entry.agent.name === agent.name
                  );
                  return (
                    <button
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive
                          ? "border-primary/35 bg-primary/10 shadow-sm"
                          : "border-border/55 bg-background/60 hover:bg-muted/70"
                      )}
                      key={agent.name}
                      onClick={() => setShowRoster(true)}
                      type="button"
                    >
                      <span
                        aria-label={`Emplacement avatar de ${agent.name}`}
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-[11px] font-bold text-white shadow-sm",
                          agent.accent
                        )}
                        title="Avatar à remplacer par votre personnage"
                      >
                        {agent.initials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-xs font-semibold">{agent.name}</span>
                          {isActive ? (
                            <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-emerald-400" />
                          ) : wasActive ? (
                            <CheckCircle2Icon className="size-3 shrink-0 text-emerald-500" />
                          ) : null}
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                          {agent.role}
                        </span>
                      </span>
                    </button>
                  );
                })}
                <p className="rounded-lg border border-dashed border-border/70 bg-background/40 px-3 py-2 text-[10px] leading-4 text-muted-foreground">
                  Ces emblèmes sont des emplacements prêts à recevoir vos avatars de personnages.
                </p>
              </div>
            ) : null}
          </div>

          <div className="border-t border-border/55 p-3">
            <div className="flex items-center justify-between rounded-xl bg-background/70 px-3 py-2.5 ring-1 ring-border/50">
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <SparklesIcon className="size-3.5 text-amber-400" /> Énergie créative
              </span>
              <span className="text-xs font-semibold">82 / 100</span>
            </div>
          </div>
        </aside>

        <section
          className={cn(
            "flex min-h-[720px] min-w-0 flex-1 overflow-hidden rounded-2xl border border-border/55 bg-card/85 shadow-[var(--shadow-float)] backdrop-blur-xl lg:min-h-0",
            isCanvasExpanded && "w-full"
          )}
        >
          <div
            className={cn(
              "flex min-w-0 flex-col bg-sidebar/80",
              isCanvasOpen && !isCanvasExpanded ? "w-full xl:w-[42%]" : "w-full"
            )}
          >
            <div className="flex min-h-14 items-center justify-between border-b border-border/55 px-4">
              <div className="flex items-center gap-2">
                <FolderKanbanIcon className="size-4 text-primary" />
                <div>
                  <p className="text-xs font-semibold">Conversation de mission</p>
                  <p className="text-[10px] text-muted-foreground">
                    Votre équipe travaille avec vous, étape par étape.
                  </p>
                </div>
              </div>
              <button
                aria-label={isCanvasOpen ? "Réduire le canvas" : "Ouvrir le canvas"}
                className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring xl:hidden"
                onClick={() => setIsCanvasOpen((value) => !value)}
                type="button"
              >
                <PanelRightIcon className="size-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 md:p-5">
              <div className="ml-auto max-w-[92%] rounded-2xl rounded-tr-md bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground shadow-sm">
                {mission || demoPrompt}
              </div>

              <div className="max-w-[94%] rounded-2xl rounded-tl-md border border-border/70 bg-background/80 p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-lg bg-gradient-to-br text-white",
                      path.accent
                    )}
                  >
                    <PathIcon className="size-3.5" />
                  </span>
                  <span className="text-xs font-semibold">{path.name}</span>
                  <span className="text-[10px] text-muted-foreground">· Équipe assignée</span>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {path.description}
                </p>
              </div>

              {timeline.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/80 bg-muted/25 p-5 text-center">
                  <WandSparklesIcon className="mx-auto size-6 text-violet-500" />
                  <h1 className="mt-3 text-base font-semibold">Prêt à lancer une vraie mission</h1>
                  <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-muted-foreground">
                    Choisissez une voie, adaptez l’idée puis avancez chaque étape. La démo montre la collaboration, le canvas et les livrables sans appeler de modèle réel.
                  </p>
                </div>
              ) : (
                timeline.map((entry, index) => (
                  <article
                    className="max-w-[95%] rounded-2xl rounded-tl-md border border-border/65 bg-background/80 p-4 shadow-sm"
                    key={entry.id}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className={cn(
                          "flex size-7 items-center justify-center rounded-lg bg-gradient-to-br text-[10px] font-bold text-white",
                          entry.agent.accent
                        )}
                      >
                        {entry.agent.initials}
                      </span>
                      <span className="text-xs font-semibold">{entry.agent.name}</span>
                      <span className="text-[10px] text-muted-foreground">{entry.agent.role}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">Étape {index + 1}</span>
                    </div>
                    <p className="text-sm leading-6">{entry.description}</p>
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/65 px-2.5 py-2 text-[11px] text-muted-foreground">
                      <FileCode2Icon className="size-3.5 text-primary" />
                      <span className="truncate">{entry.artifact}</span>
                    </div>
                  </article>
                ))
              )}

              {isCompleted ? (
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2Icon className="mt-0.5 size-5 text-emerald-500" />
                    <div>
                      <p className="text-sm font-semibold">Première version prête à explorer</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Le canvas contient la preview, les fichiers, les données de mission et le journal de livraison.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="border-t border-border/55 bg-background/85 p-3 md:p-4">
              <label className="sr-only" htmlFor="demo-mission">
                Idée de démonstration
              </label>
              <textarea
                className="min-h-20 w-full resize-none rounded-xl border border-border/70 bg-muted/35 px-3 py-2.5 text-sm leading-5 outline-none transition focus:border-primary/45 focus:ring-2 focus:ring-primary/20"
                id="demo-mission"
                onChange={(event) => setMission(event.target.value)}
                value={mission}
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="hidden text-[10px] text-muted-foreground sm:block">
                  Démo interactive : aucune requête IA ni publication réelle n’est envoyée.
                </p>
                <button
                  className={cn(
                    "ml-auto inline-flex items-center gap-2 rounded-xl bg-gradient-to-r px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    path.accent
                  )}
                  onClick={isCompleted ? restartMission : advanceMission}
                  type="button"
                >
                  {isCompleted ? (
                    <>
                      <RefreshCwIcon className="size-3.5" /> Rejouer la mission
                    </>
                  ) : stepIndex === 0 ? (
                    <>
                      <PlayIcon className="size-3.5" /> Démarrer la mission
                    </>
                  ) : (
                    <>
                      Étape suivante <ArrowRightIcon className="size-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {isCanvasOpen && !isCanvasExpanded ? (
            <div className="hidden w-px shrink-0 bg-border/70 xl:block" />
          ) : null}

          {isCanvasOpen ? (
            <aside className="flex min-w-0 flex-1 flex-col bg-background/85">
              <div className="flex min-h-14 flex-wrap items-center justify-between gap-2 border-b border-border/55 bg-sidebar/85 px-3 py-2 backdrop-blur-xl md:px-4">
                <div className="flex items-center gap-1 rounded-lg bg-muted/70 p-1">
                  {[
                    { icon: EyeIcon, id: "preview" as const, label: "Preview" },
                    { icon: Code2Icon, id: "code" as const, label: "Code" },
                    { icon: DatabaseIcon, id: "data" as const, label: "Données" },
                    { icon: TerminalSquareIcon, id: "console" as const, label: "Console" },
                  ].map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <button
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          activeView === item.id
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        key={item.id}
                        onClick={() => setActiveView(item.id)}
                        type="button"
                      >
                        <ItemIcon className="size-3.5" />
                        <span className="hidden sm:inline">{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1">
                  <div className="hidden rounded-lg border border-border/65 bg-background p-0.5 sm:flex">
                    {[
                      { icon: MonitorIcon, id: "desktop" as const, label: "Bureau" },
                      { icon: TabletIcon, id: "tablet" as const, label: "Tablette" },
                      { icon: SmartphoneIcon, id: "mobile" as const, label: "Mobile" },
                    ].map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <button
                          aria-label={item.label}
                          className={cn(
                            "rounded-md p-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            device === item.id
                              ? "bg-muted text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          key={item.id}
                          onClick={() => setDevice(item.id)}
                          type="button"
                        >
                          <ItemIcon className="size-3.5" />
                        </button>
                      );
                    })}
                  </div>
                  <button
                    aria-label="Réinitialiser la preview"
                    className="rounded-lg border border-border/65 bg-background p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => {
                      setPreviewPage("home");
                      setActiveView("preview");
                    }}
                    type="button"
                  >
                    <RefreshCwIcon className="size-3.5" />
                  </button>
                  <button
                    aria-label={isCanvasExpanded ? "Réduire le canvas" : "Agrandir le canvas"}
                    className="rounded-lg border border-border/65 bg-background p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setIsCanvasExpanded((value) => !value)}
                    type="button"
                  >
                    <PanelRightIcon className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4">
                {activeView === "preview" ? (
                  <DemoPreview
                    device={device}
                    path={path}
                    previewPage={previewPage}
                    setPreviewPage={setPreviewPage}
                    stepIndex={stepIndex}
                  />
                ) : null}
                {activeView === "code" ? (
                  <DemoCode
                    path={path}
                    selectedFile={selectedFile}
                    setSelectedFile={setSelectedFile}
                    stepIndex={stepIndex}
                  />
                ) : null}
                {activeView === "data" ? <DemoData path={path} stepIndex={stepIndex} /> : null}
                {activeView === "console" ? <DemoConsole path={path} stepIndex={stepIndex} /> : null}
              </div>

              <div className="flex items-center justify-between border-t border-border/55 bg-sidebar/70 px-3 py-2 text-[10px] text-muted-foreground md:px-4">
                <span className="flex items-center gap-1.5">
                  <span className={cn("size-1.5 rounded-full", isCompleted ? "bg-emerald-400" : "bg-amber-400 animate-pulse")} />
                  {isCompleted ? "Workspace prêt" : `${activeAgent.name} prépare la suite`}
                </span>
                <span className="hidden sm:inline">Démonstration locale · aucune donnée persistée</span>
              </div>
            </aside>
          ) : null}
        </section>
      </section>
    </main>
  );
}

function DemoPreview({
  device,
  path,
  previewPage,
  setPreviewPage,
  stepIndex,
}: {
  device: "desktop" | "tablet" | "mobile";
  path: ReturnType<typeof getDemoPath>;
  previewPage: PreviewPage;
  setPreviewPage: (page: PreviewPage) => void;
  stepIndex: number;
}) {
  const previewWidth =
    device === "mobile" ? "max-w-[320px]" : device === "tablet" ? "max-w-[720px]" : "max-w-none";

  return (
    <div className={cn("mx-auto min-h-full transition-[max-width] duration-300", previewWidth)}>
      <div className="min-h-[610px] overflow-hidden rounded-xl border border-border/70 bg-white text-slate-950 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-rose-400" />
            <span className="size-2 rounded-full bg-amber-300" />
            <span className="size-2 rounded-full bg-emerald-400" />
          </div>
          <span className="truncate rounded-md bg-slate-100 px-2 py-1 text-[10px] text-slate-500">
            idealy.demo / {previewPage}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600">
            <span className="size-1.5 rounded-full bg-emerald-500" /> live
          </span>
        </div>

        <div className="bg-[radial-gradient(circle_at_20%_0%,rgba(125,211,252,0.25),transparent_33%),radial-gradient(circle_at_90%_20%,rgba(196,181,253,0.34),transparent_38%),#f8fafc] p-5 md:p-7">
          <div className="mb-9 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-semibold">
              <span className={cn("size-3 rounded-sm bg-gradient-to-br", path.accent)} />
              Atelier Horizon
            </div>
            <nav className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white/80 p-1 text-[10px] text-slate-500 shadow-sm">
              {[
                ["home", "Accueil"],
                ["plan", "Mon plan"],
                ["moment", "Progrès"],
              ].map(([id, label]) => (
                <button
                  className={cn(
                    "rounded-md px-2 py-1.5 transition",
                    previewPage === id ? "bg-slate-900 text-white" : "hover:bg-slate-100"
                  )}
                  key={id}
                  onClick={() => setPreviewPage(id as PreviewPage)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {previewPage === "home" ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">Atelier du jour</p>
              <h2 className="mt-3 max-w-xl text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
                Une idée claire mérite un premier mouvement.
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-6 text-slate-600">
                Choisissez un cap, recevez un plan simple et avancez avec une énergie qui vous ressemble.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {[
                  ["Choisir", "Une idée à servir", "01"],
                  ["Construire", "Un plan réalisable", "02"],
                  ["Célébrer", "Chaque progrès", "03"],
                ].map(([title, text, number]) => (
                  <article className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm" key={title}>
                    <span className="text-[10px] font-semibold text-sky-600">{number}</span>
                    <h3 className="mt-4 text-sm font-semibold">{title}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
                  </article>
                ))}
              </div>
              <button
                className={cn("mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r px-4 py-2.5 text-xs font-semibold text-white shadow-sm", path.accent)}
                onClick={() => setPreviewPage("plan")}
                type="button"
              >
                Voir mon plan <ChevronRightIcon className="size-3.5" />
              </button>
            </>
          ) : null}

          {previewPage === "plan" ? (
            <>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Plan personnel</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">Une progression qui reste légère.</h2>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">Semaine 1</span>
              </div>
              <div className="mt-6 space-y-3">
                {demoMissionSteps.map((step, index) => {
                  const done = index < stepIndex;
                  return (
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/90 p-3" key={step.id}>
                      <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold", done ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500")}>
                        {done ? "✓" : index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{step.label}</span>
                        <span className="block truncate text-[11px] text-slate-500">{step.description}</span>
                      </span>
                      <span className={cn("text-[10px] font-medium", done ? "text-emerald-600" : "text-slate-400")}>
                        {done ? "Validé" : "À venir"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}

          {previewPage === "moment" ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">Moments de progrès</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Vous avancez déjà mieux que vous ne le pensez.</h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-900 p-5 text-white">
                  <p className="text-xs text-white/60">Focus de la semaine</p>
                  <p className="mt-4 text-4xl font-semibold">{Math.max(1, stepIndex)} / 4</p>
                  <p className="mt-2 text-xs leading-5 text-white/65">Étapes de mission validées avec votre équipe Idealy.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-xs text-slate-500">Récompense en cours</p>
                  <p className="mt-4 text-base font-semibold">{path.reward}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">Le rythme s’adapte à la voie choisie.</p>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DemoCode({
  path,
  selectedFile,
  setSelectedFile,
  stepIndex,
}: {
  path: ReturnType<typeof getDemoPath>;
  selectedFile: string;
  setSelectedFile: (file: string) => void;
  stepIndex: number;
}) {
  const code = `export function MissionCard() {
  return (
    <section className="mission-card">
      <p className="eyebrow">${path.name}</p>
      <h1>Votre prochain mouvement</h1>
      <ProgressRing value={${progressForStep(stepIndex)}} />
      <button>Choisir une action</button>
    </section>
  );
}`;

  return (
    <div className="flex min-h-full overflow-hidden rounded-xl border border-border/65 bg-[#11111a] text-slate-100 shadow-sm">
      <aside className="hidden w-44 shrink-0 border-r border-white/10 bg-white/[0.02] p-2 sm:block">
        <p className="px-2 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-white/40">Fichiers générés</p>
        {codeFiles.map((file) => (
          <button
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[11px] transition",
              selectedFile === file ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5 hover:text-white"
            )}
            key={file}
            onClick={() => setSelectedFile(file)}
            type="button"
          >
            <FileCode2Icon className="size-3.5 text-sky-300" />
            <span className="truncate">{file}</span>
          </button>
        ))}
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-[10px] text-white/45">
          <span>{selectedFile}</span>
          <span>TypeScript React</span>
        </div>
        <pre className="overflow-x-auto p-4 text-xs leading-6 text-slate-200"><code>{code}</code></pre>
        <div className="mx-4 mb-4 rounded-xl border border-sky-300/15 bg-sky-400/10 p-3 text-xs leading-5 text-sky-100/75">
          Démo : les fichiers sont une projection explicative de la mission, sans écriture réelle dans le workspace.
        </div>
      </div>
    </div>
  );
}

function DemoData({ path, stepIndex }: { path: ReturnType<typeof getDemoPath>; stepIndex: number }) {
  const rows = [
    ["mission", "Mission créative", "active"],
    ["path", path.name, "selected"],
    ["progress", `${progressForStep(stepIndex)}%`, "updated"],
    ["reward", path.reward, "ready"],
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border/65 bg-background shadow-sm">
      <div className="flex items-center justify-between border-b border-border/65 px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Données de mission</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Vue pédagogique du schéma qui accompagne une mission.</p>
        </div>
        <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">read-only</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-xs">
          <thead className="border-b border-border/65 bg-muted/45 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Clé</th>
              <th className="px-4 py-3 font-medium">Valeur</th>
              <th className="px-4 py-3 font-medium">État</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([key, value, state]) => (
              <tr className="border-b border-border/45 last:border-0" key={key}>
                <td className="px-4 py-3 font-mono text-primary">{key}</td>
                <td className="px-4 py-3 font-medium">{value}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">{state}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border/65 px-4 py-3 text-[11px] leading-5 text-muted-foreground">
        La vraie synchronisation Supabase reste séparée de cette démo : aucun enregistrement n’est créé ici.
      </p>
    </div>
  );
}

function DemoConsole({ path, stepIndex }: { path: ReturnType<typeof getDemoPath>; stepIndex: number }) {
  const logs = demoMissionSteps.map((step, index) => ({
    label: index < stepIndex ? "ok" : "waiting",
    message: index < stepIndex ? `${path.agents[step.agentIndex].name} · ${step.artifact}` : `En attente · ${step.label}`,
  }));

  return (
    <div className="overflow-hidden rounded-xl border border-border/65 bg-[#101015] text-slate-200 shadow-sm">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-xs">
        <TerminalSquareIcon className="size-4 text-emerald-300" />
        Journal de mission
      </div>
      <div className="space-y-2 p-4 font-mono text-[11px] leading-6">
        <p className="text-white/45">$ idealy mission --path={path.id}</p>
        {logs.map((log) => (
          <p className="flex gap-2" key={log.message}>
            <span className={log.label === "ok" ? "text-emerald-300" : "text-amber-300"}>
              [{log.label === "ok" ? "✓" : "…"}]
            </span>
            <span className="text-white/75">{log.message}</span>
          </p>
        ))}
        <p className="pt-2 text-sky-200/80">Démonstration locale : aucun agent externe n’est invoqué.</p>
      </div>
    </div>
  );
}
