"use client";

import {
  CheckCircle2,
  ChevronDown,
  Code2,
  Crosshair,
  Database,
  ExternalLink,
  Globe2,
  History,
  Laptop,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  RefreshCw,
  Share2,
  Smartphone,
  Sparkles,
  Star,
  Tablet,
  TerminalSquare,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR, { unstable_serialize, useSWRConfig } from "swr";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PowerStatusBadge } from "@/components/chat/power-status";
import { CheckpointModal } from "@/components/chat/checkpoint-modal";
import { useActiveChat } from "@/hooks/use-active-chat";
import { useArtifact } from "@/hooks/use-artifact";
import { fetcher } from "@/lib/utils";
import { downloadZip } from "@/lib/export/zip";
import { localWorkspaceMetadata } from "@/lib/idealy/local-workspace-demo";
import { getChatHistoryPaginationKey } from "@/lib/chat-history-key";

type WorkspaceView = "preview" | "code" | "database";
type Device = "desktop" | "tablet" | "mobile";
type PreviewPage = { label: string; path: string };

const controlClass =
  "inline-flex items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:bg-sidebar-accent focus-visible:text-sidebar-foreground";

const previewPages: PreviewPage[] = [
  { label: "Home", path: "/" },
  { label: "Settings", path: "/settings" },
  { label: "Dashboard", path: "/dashboard" },
];

/**
 * Derive a precise, truthful status label from the mission squad lifecycle.
 * Zero tolerance for fabricated state — every label must correspond to a real signal.
 */
function resolveSquadStatusLabel(
  missionSquadStatus: string | undefined,
  isSquadRunning: boolean,
  refreshing: boolean
): { label: string; tone: "emerald" | "sky" | "amber" | "rose" | "muted" } {
  if (refreshing) {
    return { label: "Mise à jour…", tone: "muted" };
  }
  if (isSquadRunning) {
    // Running — check for correction phase signals
    if (missionSquadStatus === "auto_correction_started") {
      return { label: "Correction auto…", tone: "amber" };
    }
    return { label: "Escouade en cours…", tone: "sky" };
  }
  // Stable states
  switch (missionSquadStatus) {
    case "ready":
      return { label: "Prêt", tone: "emerald" };
    case "building":
      return { label: "Construction…", tone: "sky" };
    case "needs-fix":
      return { label: "Correction requise", tone: "rose" };
    case "needs-user-input":
      return { label: "Votre retour requis", tone: "amber" };
    case "planned":
      return { label: "Planifié", tone: "muted" };
    case "draft":
      return { label: "Brouillon", tone: "muted" };
    case "running-local-demo":
      return { label: "Démo locale", tone: "sky" };
    default:
      // No mission active — show nothing deceptive
      return { label: "En attente", tone: "muted" };
  }
}

export function BuildTopBar() {
  const { artifact, metadata, setMetadata } = useArtifact();
  const { chatId } = useActiveChat();
  const { mutate } = useSWRConfig();
  const historyKey = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/history?limit=50`;
  const { data: recentHistory } = useSWR<{
    chats: Array<{ id: string; title: string }>;
  }>(process.env.NEXT_PUBLIC_DEMO_MODE === "true" ? null : historyKey, fetcher, {
    revalidateOnFocus: false,
  });
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const [title, setTitle] = useState("Projet Idealy");
  const [renameDraft, setRenameDraft] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [view, setView] = useState<WorkspaceView>("preview");
  const [device, setDevice] = useState<Device>("desktop");
  const [page, setPage] = useState<PreviewPage>(previewPages[0]);
  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isCanvasExpanded, setIsCanvasExpanded] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const pageMenuRef = useRef<HTMLDivElement>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const missionId =
    typeof metadata?.missionId === "string" ? metadata.missionId : null;
  const [isSquadRunning, setIsSquadRunning] = useState(false);
  const [isInspectorActive, setIsInspectorActive] = useState(false);
  const [isCheckpointModalOpen, setIsCheckpointModalOpen] = useState(false);

  useEffect(() => {
    setFavorite(false);
    setRenameDraft("");
    setRenameOpen(false);
  }, [chatId]);

  useEffect(() => {
    if (artifact?.title && artifact.title !== "init") {
      setTitle(artifact.title);
    } else {
      const currentChat = recentHistory?.chats?.find((chat) => chat.id === chatId);
      if (currentChat?.title) {
        setTitle(currentChat.title);
      } else if (typeof metadata?.title === "string" && metadata.title) {
        setTitle(metadata.title);
      } else if (chatId) {
        setTitle("Studio Session");
      }
    }
  }, [chatId, artifact?.title, recentHistory, metadata]);

  useEffect(() => {
    if (!chatId) return;
    try {
      setFavorite(window.localStorage.getItem(`idealy:favorite:${chatId}`) === "true");
    } catch {
      setFavorite(false);
    }
  }, [chatId]);

  // Derive squad status label from real metadata — no static strings
  const missionSquadStatus =
    typeof metadata?.missionSquadStatus === "string"
      ? (metadata.missionSquadStatus as string)
      : undefined;

  const { label: squadLabel, tone: squadTone } = resolveSquadStatusLabel(
    missionSquadStatus,
    isSquadRunning,
    refreshing
  );

  useEffect(() => {
    const handleInspectorClosed = () => setIsInspectorActive(false);
    window.addEventListener("idealy:inspector-closed", handleInspectorClosed);
    return () => {
      window.removeEventListener("idealy:inspector-closed", handleInspectorClosed);
    };
  }, []);

  // Command palette integration: checkpoint modal
  useEffect(() => {
    const handleOpenCheckpoint = () => setIsCheckpointModalOpen(true);
    window.addEventListener("idealy:open-checkpoint-modal", handleOpenCheckpoint);
    return () =>
      window.removeEventListener("idealy:open-checkpoint-modal", handleOpenCheckpoint);
  }, []);

  // Command palette integration: toggle visual inspector
  useEffect(() => {
    const handleToggleInspector = () => {
      setIsInspectorActive((prev) => {
        const next = !prev;
        window.dispatchEvent(
          new CustomEvent("idealy:toggle-inspector", { detail: String(next) })
        );
        return next;
      });
    };
    window.addEventListener("idealy:toggle-visual-inspector", handleToggleInspector);
    return () =>
      window.removeEventListener("idealy:toggle-visual-inspector", handleToggleInspector);
  }, []);

  // Command palette integration: switch workspace view
  useEffect(() => {
    const handleSwitchView = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail === "code" || detail === "database" || detail === "preview") {
        setView(detail as WorkspaceView);
        window.dispatchEvent(new CustomEvent("idealy:set-view", { detail }));
      }
    };
    window.addEventListener("idealy:switch-workspace-view", handleSwitchView);
    return () =>
      window.removeEventListener("idealy:switch-workspace-view", handleSwitchView);
  }, []);

  const toggleInspector = () => {
    setIsInspectorActive((prev) => {
      const next = !prev;
      dispatch("idealy:toggle-inspector", String(next));
      return next;
    });
  };

  useEffect(() => {
    const closeMenus = (event: Event) => {
      const target = event.target as Node;
      if (!moreMenuRef.current?.contains(target)) {
        setMoreOpen(false);
      }
      if (!pageMenuRef.current?.contains(target)) {
        setPageMenuOpen(false);
      }
      if (!toolsMenuRef.current?.contains(target)) {
        setToolsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMoreOpen(false);
        setPageMenuOpen(false);
        setToolsOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeMenus);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenus);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const dispatch = (name: string, detail?: string) => {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  };

  const selectView = (nextView: WorkspaceView) => {
    setView(nextView);
    setToolsOpen(false);
    dispatch("idealy:set-view", nextView);
  };

  const selectDevice = (nextDevice: Device) => {
    setDevice(nextDevice);
    dispatch("idealy:set-device", nextDevice);
  };

  const selectPage = (nextPage: PreviewPage) => {
    setPage(nextPage);
    setPageMenuOpen(false);
    dispatch("idealy:set-preview-page", nextPage.path);
  };

  const toggleCanvasFullscreen = () => {
    setIsCanvasExpanded((value) => !value);
    dispatch("idealy:toggle-fullscreen");
  };

  const refresh = () => {
    setRefreshing(true);
    dispatch("idealy:refresh-preview");
    window.setTimeout(() => setRefreshing(false), 700);
  };

  const rename = () => {
    setRenameDraft(title);
    setRenameOpen(true);
  };

  const saveTitle = async () => {
    const nextTitle = renameDraft.trim();
    if (!nextTitle || nextTitle === title) {
      setRenameOpen(false);
      return;
    }
    if (isDemoMode || !chatId) {
      setTitle(nextTitle);
      setRenameOpen(false);
      toast.success("Titre mis à jour pour cette démo.");
      return;
    }
    setIsSavingTitle(true);
    try {
      const response = await fetch(`/api/chat?id=${encodeURIComponent(chatId)}`, {
        body: JSON.stringify({ title: nextTitle }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      if (!response.ok) throw new Error("Le titre n’a pas pu être enregistré.");
      setTitle(nextTitle);
      setRenameOpen(false);
      await mutate(
        historyKey,
        (current: { chats: Array<{ id: string; title: string }> } | undefined) =>
          current
            ? {
                ...current,
                chats: current.chats.map((chat) =>
                  chat.id === chatId ? { ...chat, title: nextTitle } : chat
                ),
              }
            : current,
        { revalidate: false }
      );
      await mutate(unstable_serialize(getChatHistoryPaginationKey));
      toast.success("Titre du projet mis à jour.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur de connexion.");
    } finally {
      setIsSavingTitle(false);
    }
  };

  const runSquad = async () => {
    if (!missionId || isSquadRunning) {
      return;
    }
    setIsSquadRunning(true);
    if (isDemoMode) {
      setMetadata((current: Record<string, unknown> | null) => ({
        ...(current ?? {}),
        missionSquadStatus: "building",
        outputs: [
          ...(Array.isArray(current?.outputs) ? current.outputs : []),
          {
            contents: [
              { type: "text", value: "[local] Lyra → Mason → Nova en cours" },
            ],
            id: `local-squad-${Date.now()}`,
            status: "running",
          },
        ],
      }));
      window.setTimeout(() => {
        setMetadata((current: Record<string, unknown> | null) => ({
          ...(current ?? {}),
          ...localWorkspaceMetadata(),
          missionSquadStatus: "ready",
        }));
        setIsSquadRunning(false);
      }, 950);
      return;
    }
    try {
      const idempotencyKey = `squad:${missionId}:${crypto.randomUUID()}`;
      const response = await fetch(`/api/idealy/missions/${missionId}/squad`, {
        body: JSON.stringify({ idempotencyKey }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        status?: string;
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "L'escouade n'a pas pu démarrer.");
      }
      setMetadata((current: Record<string, unknown> | null) => ({
        ...(current ?? {}),
        missionReplayNonce: Number(current?.missionReplayNonce ?? 0) + 1,
        missionSquadStatus: payload?.status ?? "ready",
      }));
    } catch (error) {
      console.error("Mission squad launch failed", error);
      const errorMessage =
        error instanceof Error ? error.message : "L'escouade n'a pas pu démarrer.";
      setMetadata((current: Record<string, unknown> | null) => ({
        ...(current ?? {}),
        missionSquadStatus: "needs-fix",
      }));
      toast.error(errorMessage);
    } finally {
      setIsSquadRunning(false);
    }
  };

  // Map tone to Tailwind classes
  const toneClasses: Record<typeof squadTone, string> = {
    emerald: "text-emerald-400",
    sky: "text-sky-300",
    amber: "text-amber-300",
    rose: "text-rose-300",
    muted: "text-muted-foreground",
  };
  const dotClasses: Record<typeof squadTone, string> = {
    emerald: "bg-emerald-400",
    sky: "bg-sky-400",
    amber: "bg-amber-400",
    rose: "bg-rose-400",
    muted: "bg-muted-foreground/40",
  };

  return (
    <header className="relative z-30 grid min-h-12 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-sidebar-border/70 bg-sidebar/95 px-2.5 text-sidebar-foreground shadow-[0_1px_0_oklch(1_0_0_/_0.03)] backdrop-blur-xl md:px-3">
      <div className="flex min-w-0 items-center gap-1.5">
        <button
          aria-label={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          aria-pressed={favorite}
          className={`${controlClass} size-8 shrink-0 ${favorite ? "text-amber-400" : ""}`}
          onClick={() => setFavorite((value) => {
            const next = !value;
            if (chatId) {
              try { window.localStorage.setItem(`idealy:favorite:${chatId}`, String(next)); } catch { /* Storage can be unavailable in private contexts. */ }
            }
            return next;
          })}
          type="button"
        >
          <Star className="size-4" fill={favorite ? "currentColor" : "none"} />
        </button>
        <span aria-hidden="true" className="h-4 w-px bg-sidebar-border/70" />
        <button
          aria-label="Project menu"
          className="flex min-w-0 items-center gap-1 rounded-lg px-2 py-1.5 text-left text-[13px] font-medium tracking-[-0.01em] hover:bg-sidebar-accent"
          onClick={rename}
          type="button"
        >
          <span className="truncate">{title}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>

        {/* Real-time collaboration presence is rendered only when backed by a real presence channel. */}
      </div>

      <div className="hidden items-center gap-1.5 md:flex">
        <div className="flex items-center gap-0.5 rounded-xl border border-sidebar-border/70 bg-background/20 p-1 shadow-sm">
          <button
            aria-label="Preview"
            aria-pressed={view === "preview"}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors ${view === "preview" ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : "text-muted-foreground hover:text-sidebar-foreground"}`}
            onClick={() => selectView("preview")}
            type="button"
          >
            Preview
          </button>
          <button
            aria-label="Database"
            aria-pressed={view === "database"}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${view === "database" ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : "text-muted-foreground hover:text-sidebar-foreground"}`}
            onClick={() => selectView("database")}
            type="button"
          >
            <Database className="size-3.5" />
            <span>Database</span>
          </button>

          {/* Menu dropdown regroupant Console, Logs, Code et slots futurs */}
          <div className="relative" ref={toolsMenuRef}>
            <button
              aria-expanded={toolsOpen}
              aria-label="Outils supplémentaires du canvas"
              className={`flex items-center justify-center rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors ${toolsOpen ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : "text-muted-foreground hover:text-sidebar-foreground"}`}
              onClick={() => setToolsOpen((prev) => !prev)}
              type="button"
              title="Outils supplémentaires (Console, Logs, Code, Slots futurs...)"
            >
              <MoreHorizontal className="size-3.5" />
            </button>
            {toolsOpen ? (
              <div className="absolute left-0 top-11 z-50 w-52 rounded-2xl border border-border/80 bg-popover/95 p-1.5 text-xs text-popover-foreground shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Outils du Canvas
                </div>
                <button
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground ${view === "code" ? "bg-accent/70 font-semibold" : ""}`}
                  onClick={() => selectView("code")}
                  type="button"
                >
                  <div className="flex items-center gap-2">
                    <Code2 className="size-3.5 text-primary" />
                    <span>Code source</span>
                  </div>
                  {view === "code" && <span className="text-[10px] text-muted-foreground font-mono">Actif</span>}
                </button>
                <button
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
                  onClick={() => {
                    selectView("preview");
                    dispatch("idealy:set-view", "console");
                    setToolsOpen(false);
                  }}
                  type="button"
                >
                  <div className="flex items-center gap-2">
                    <TerminalSquare className="size-3.5 text-sky-400" />
                    <span>Console</span>
                  </div>
                </button>
                <button
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
                  onClick={() => {
                    selectView("preview");
                    dispatch("idealy:set-view", "console");
                    setToolsOpen(false);
                  }}
                  type="button"
                >
                  <div className="flex items-center gap-2">
                    <History className="size-3.5 text-violet-400" />
                    <span>Logs & Pipeline</span>
                  </div>
                </button>
                <div className="my-1 border-t border-border/50" />
                <div className="px-2.5 py-1 text-[10px] font-mono text-muted-foreground/60">
                  Slots outils futurs (SQL, API)
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="relative" ref={pageMenuRef}>
          <button
            aria-expanded={pageMenuOpen}
            aria-label="Preview page"
            className="inline-flex h-10 min-w-[112px] items-center gap-2 rounded-xl border border-sidebar-border/70 bg-background/20 px-2.5 text-left shadow-sm transition-colors hover:bg-sidebar-accent"
            onClick={() => setPageMenuOpen((value) => !value)}
            type="button"
          >
            <Globe2 className="size-3.5 shrink-0 text-sky-300" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-semibold leading-4 text-sidebar-foreground">
                {page.label}
              </span>
              <span className="block truncate font-mono text-[9px] leading-3 text-muted-foreground">
                {page.path}
              </span>
            </span>
            <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
          </button>
          {pageMenuOpen ? (
            <div className="absolute left-0 top-11 z-50 w-44 rounded-xl border border-border/70 bg-popover/95 p-1.5 text-xs text-popover-foreground shadow-2xl backdrop-blur-xl">
              {previewPages.map((previewPage) => (
                <button
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left hover:bg-accent hover:text-accent-foreground ${page.path === previewPage.path ? "bg-accent/70" : ""}`}
                  key={previewPage.path}
                  onClick={() => selectPage(previewPage)}
                  type="button"
                >
                  <span>{previewPage.label}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {previewPage.path}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-0.5 rounded-xl border border-sidebar-border/70 bg-background/20 p-1 shadow-sm">
          <button
            aria-label="Desktop"
            aria-pressed={device === "desktop"}
            className={`${controlClass} size-8 ${device === "desktop" ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : ""}`}
            onClick={() => selectDevice("desktop")}
            type="button"
          >
            <Laptop className="size-4" />
          </button>
          <button
            aria-label="Tablet"
            aria-pressed={device === "tablet"}
            className={`${controlClass} size-8 ${device === "tablet" ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : ""}`}
            onClick={() => selectDevice("tablet")}
            type="button"
          >
            <Tablet className="size-4" />
          </button>
          <button
            aria-label="Mobile"
            aria-pressed={device === "mobile"}
            className={`${controlClass} size-8 ${device === "mobile" ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : ""}`}
            onClick={() => selectDevice("mobile")}
            type="button"
          >
            <Smartphone className="size-4" />
          </button>
          <button
            aria-label="Refresh"
            className={`${controlClass} size-8 ${refreshing ? "text-sky-300" : ""}`}
            onClick={refresh}
            type="button"
          >
            <RefreshCw
              className={`size-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
          {view === "preview" && (
            <button
              aria-label="Inspecteur visuel"
              aria-pressed={isInspectorActive}
              className={`${controlClass} size-8 ${isInspectorActive ? "bg-sky-400/20 text-sky-300" : ""}`}
              onClick={toggleInspector}
              title="Inspecter un élément visuel"
              type="button"
            >
              <Crosshair className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex min-w-0 items-center justify-end gap-1">
        <PowerStatusBadge compact />
        {/* Squad status — derived from real missionSquadStatus, never fabricated */}
        <div
          aria-live="polite"
          className="hidden items-center gap-1.5 rounded-full border border-sidebar-border/70 bg-background/20 px-2.5 py-1 text-[10px] font-medium lg:flex"
        >
          <span
            className={`size-1.5 rounded-full shrink-0 ${dotClasses[squadTone]} ${isSquadRunning ? "animate-pulse" : ""}`}
          />
          <span className={toneClasses[squadTone]}>{squadLabel}</span>
        </div>
        <div className="relative" ref={moreMenuRef}>
          <button
            aria-expanded={moreOpen}
            aria-label="Ouvrir les outils du workspace"
            className={`${controlClass} size-8`}
            onClick={() => setMoreOpen((value) => !value)}
            type="button"
          >
            <MoreHorizontal className="size-[17px]" />
          </button>
          {moreOpen ? (
            <div className="absolute right-0 top-10 z-50 max-h-[calc(100dvh-5rem)] w-60 overflow-y-auto overscroll-contain rounded-2xl border border-border/70 bg-popover/95 p-2 text-xs text-popover-foreground shadow-2xl backdrop-blur-xl">
              <p className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">Vue du workspace</p>
              {([
                ["preview", "Aperçu"],
                ["code", "Code"],
                ["database", "Données"],
              ] as const).map(([nextView, frenchLabel]) => (
                <button
                  aria-pressed={view === nextView}
                  className={`flex min-h-9 w-full items-center justify-between rounded-lg px-2.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground ${view === nextView ? "bg-accent/70 font-medium" : ""}`}
                  key={nextView}
                  onClick={() => {
                    setMoreOpen(false);
                    selectView(nextView);
                  }}
                  type="button"
                >
                  <span>{frenchLabel}</span>
                  {view === nextView ? <span className="text-[10px] text-muted-foreground">Actif</span> : null}
                </button>
              ))}
              <div className="my-2 border-t border-border/60" />
              <p className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">Taille de l’aperçu</p>
              <div className="grid grid-cols-3 gap-1">
                {([
                  ["desktop", "Ordinateur", Laptop],
                  ["tablet", "Tablette", Tablet],
                  ["mobile", "Téléphone", Smartphone],
                ] as const).map(([nextDevice, label, Icon]) => (
                  <button
                    aria-label={label}
                    aria-pressed={device === nextDevice}
                    className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] transition-colors hover:bg-accent ${device === nextDevice ? "bg-accent/70 text-foreground" : "text-muted-foreground"}`}
                    key={nextDevice}
                    onClick={() => {
                      setMoreOpen(false);
                      selectDevice(nextDevice);
                    }}
                    type="button"
                  >
                    <Icon aria-hidden="true" className="size-4" />
                    {label}
                  </button>
                ))}
              </div>
              {view === "preview" ? (
                <button
                  aria-pressed={isInspectorActive}
                  className={`mt-1 flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 text-left transition-colors hover:bg-accent ${isInspectorActive ? "text-sky-300" : "text-muted-foreground"}`}
                  onClick={() => {
                    setMoreOpen(false);
                    toggleInspector();
                  }}
                  type="button"
                >
                  <Crosshair aria-hidden="true" className="size-3.5" />
                  Inspecter l’aperçu
                </button>
              ) : null}
              {missionId ? (
                <button
                  aria-busy={isSquadRunning}
                  className="mt-1 flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sky-300 transition-colors hover:bg-accent disabled:opacity-50"
                  disabled={isSquadRunning}
                  onClick={() => {
                    setMoreOpen(false);
                    void runSquad();
                  }}
                  type="button"
                >
                  <Sparkles aria-hidden="true" className="size-3.5" />
                  {isSquadRunning ? "Escouade en cours…" : "Lancer l’escouade"}
                </button>
              ) : null}
              <div className="my-2 border-t border-border/60" />
              <button
                className="block w-full rounded-lg px-2.5 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  setMoreOpen(false);
                  const files: { path: string; content: string }[] = [];
                  if (
                    Array.isArray(metadata?.missionFiles) &&
                    metadata.missionFiles.length > 0
                  ) {
                    for (const f of metadata.missionFiles) {
                      if (f?.path) {
                        files.push({
                          path: f.path,
                          content: f.content || "",
                        });
                      }
                    }
                  }
                  if (files.length === 0 && artifact.content) {
                    const ext =
                      artifact.kind === "code"
                        ? "tsx"
                        : artifact.kind === "sheet"
                          ? "csv"
                          : "txt";
                    files.push({
                      path: `src/App.${ext}`,
                      content: artifact.content,
                    });
                    files.push({
                      path: "README.md",
                      content: `# ${title || "Idealy Project"}\n\nGenerated with Idealy Studio.`,
                    });
                    files.push({
                      path: "package.json",
                      content: JSON.stringify(
                        {
                          name: (title || "idealy-project")
                            .toLowerCase()
                            .replace(/[^a-z0-9]/g, "-"),
                          private: true,
                          version: "0.1.0",
                        },
                        null,
                        2
                      ),
                    });
                  }
                  if (files.length === 0) {
                    toast.error("Aucun fichier à exporter pour le moment.");
                    return;
                  }
                  downloadZip(
                    (title || "idealy-project")
                      .toLowerCase()
                      .replace(/[^a-z0-9]/g, "-"),
                    files
                  );
                  toast.success("Téléchargement du ZIP lancé !");
                }}
                type="button"
              >
                Télécharger le ZIP
              </button>
              <button
                className="block w-full rounded-lg px-2.5 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  setMoreOpen(false);
                  dispatch("idealy:show-console");
                }}
                type="button"
              >
                Ouvrir la console
              </button>
              <button
                className="block w-full rounded-lg px-2.5 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  setMoreOpen(false);
                  rename();
                }}
                type="button"
              >
                Renommer le projet
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sky-300 hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  setMoreOpen(false);
                  setIsCheckpointModalOpen(true);
                }}
                type="button"
              >
                <History className="size-3.5" />
                <span>Checkpoints & GitHub</span>
              </button>
            </div>
          ) : null}
        </div>
        <button
          aria-label="Open preview in new window"
          className={`${controlClass} hidden size-8 md:inline-flex`}
          onClick={() => dispatch("idealy:open-preview")}
          type="button"
        >
          <ExternalLink className="size-4" />
        </button>
        <button
          aria-label={isCanvasExpanded ? "Exit fullscreen" : "Expand preview"}
          aria-pressed={isCanvasExpanded}
          className={`${controlClass} hidden size-8 md:inline-flex`}
          onClick={toggleCanvasFullscreen}
          type="button"
        >
          {isCanvasExpanded ? (
            <Minimize2 className="size-4" />
          ) : (
            <Maximize2 className="size-4" />
          )}
        </button>
        <button
          aria-label="Copier le lien de cette discussion"
          className={`${controlClass} hidden size-8 md:inline-flex`}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.href);
              toast.success("Lien de cette discussion copié.");
            } catch {
              toast.info("Le navigateur n’autorise pas la copie du lien.");
            }
          }}
          type="button"
        >
          <Share2 className="size-4" />
        </button>
        {missionId ? (
          <button
            aria-busy={isSquadRunning}
            aria-label="Run mission squad"
            className="hidden h-8 items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-400/10 px-2.5 text-[11px] font-semibold text-sky-200 transition hover:bg-sky-400/20 disabled:cursor-wait disabled:opacity-60 lg:inline-flex"
            disabled={isSquadRunning}
            onClick={runSquad}
            type="button"
          >
            <Sparkles
              className={`size-3.5 ${isSquadRunning ? "animate-pulse" : ""}`}
            />
            {isSquadRunning ? "Building" : "Run squad"}
          </button>
        ) : null}
        <button
          aria-label="Configurer le déploiement"
          className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-[11px] font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98]"
          onClick={() => {
            if (isDemoMode) {
              toast.info(
                "Démo locale : publication protégée. Connectez-vous pour publier votre projet."
              );
              return;
            }
            window.location.assign("/plugins");
          }}
          type="button"
        >
          Déployer
        </button>
      </div>

      <CheckpointModal
        isOpen={isCheckpointModalOpen}
        missionId={missionId}
        onClose={() => setIsCheckpointModalOpen(false)}
        onRollback={() => {
          refresh();
          setMetadata((cur: Record<string, unknown> | null) => ({
            ...(cur ?? {}),
            missionReplayNonce: Number(cur?.missionReplayNonce ?? 0) + 1,
          }));
        }}
      />
      <Dialog onOpenChange={setRenameOpen} open={renameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer le projet</DialogTitle>
            <DialogDescription>Choisissez un nom facile à retrouver dans votre historique.</DialogDescription>
          </DialogHeader>
          <Input autoFocus maxLength={120} onChange={(event) => setRenameDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void saveTitle(); }} value={renameDraft} />
          <DialogFooter>
            <Button disabled={isSavingTitle} onClick={() => setRenameOpen(false)} variant="outline">Annuler</Button>
            <Button disabled={isSavingTitle || !renameDraft.trim()} onClick={() => void saveTitle()}>{isSavingTitle ? "Enregistrement…" : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
