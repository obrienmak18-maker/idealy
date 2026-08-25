"use client";

import {
  CheckCircle2,
  ChevronDown,
  Code2,
  Database,
  ExternalLink,
  Globe2,
  Laptop,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  RefreshCw,
  Share2,
  Smartphone,
  Star,
  Sparkles,
  Tablet,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useArtifact } from "@/hooks/use-artifact";

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

export function BuildTopBar() {
  const { metadata, setMetadata } = useArtifact();
  const [title, setTitle] = useState("UI/UX analysis");
  const [favorite, setFavorite] = useState(false);
  const [view, setView] = useState<WorkspaceView>("preview");
  const [device, setDevice] = useState<Device>("desktop");
  const [page, setPage] = useState<PreviewPage>(previewPages[0]);
  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [isCanvasExpanded, setIsCanvasExpanded] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const pageMenuRef = useRef<HTMLDivElement>(null);
  const missionId =
    typeof metadata?.missionId === "string" ? metadata.missionId : null;
  const [isSquadRunning, setIsSquadRunning] = useState(false);

  useEffect(() => {
    const closeMenus = (event: Event) => {
      const target = event.target as Node;
      if (!moreMenuRef.current?.contains(target)) {
        setMoreOpen(false);
      }
      if (!pageMenuRef.current?.contains(target)) {
        setPageMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMoreOpen(false);
        setPageMenuOpen(false);
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
    setStatus("Refreshing");
    dispatch("idealy:refresh-preview");
    window.setTimeout(() => setStatus("Ready"), 700);
  };

  const rename = () => {
    const nextTitle = window.prompt("Renommer le projet", title);
    if (nextTitle?.trim()) {
      setTitle(nextTitle.trim());
    }
  };

  const runSquad = async () => {
    if (!missionId || isSquadRunning) return;
    setIsSquadRunning(true);
    setStatus("Running squad");
    try {
      const idempotencyKey = `squad:${missionId}:${crypto.randomUUID()}`;
      const response = await fetch(
        `/api/idealy/missions/${missionId}/squad`,
        {
          body: JSON.stringify({ idempotencyKey }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; status?: string }
        | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "L’escouade n’a pas pu démarrer.");
      }
      setMetadata((current: Record<string, unknown> | null) => ({
        ...(current ?? {}),
        missionReplayNonce: Number(current?.missionReplayNonce ?? 0) + 1,
        missionSquadStatus: payload?.status ?? "ready",
      }));
      setStatus("Squad complete");
    } catch (error) {
      console.error("Mission squad launch failed", error);
      setStatus("Squad unavailable");
    } finally {
      setIsSquadRunning(false);
    }
  };

  return (
    <header className="relative z-30 grid min-h-12 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-sidebar-border/70 bg-sidebar/95 px-2.5 text-sidebar-foreground shadow-[0_1px_0_oklch(1_0_0_/_0.03)] backdrop-blur-xl md:px-3">
      <div className="flex min-w-0 items-center gap-1.5">
        <button
          aria-label="Favorite project"
          aria-pressed={favorite}
          className={`${controlClass} size-8 shrink-0 ${favorite ? "text-amber-400" : ""}`}
          onClick={() => setFavorite((value) => !value)}
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
            aria-label="Code"
            aria-pressed={view === "code"}
            className={`${controlClass} size-8 ${view === "code" ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : ""}`}
            onClick={() => selectView("code")}
            type="button"
          >
            <Code2 className="size-4" />
          </button>
          <button
            aria-label="Database"
            aria-pressed={view === "database"}
            className={`${controlClass} size-8 ${view === "database" ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : ""}`}
            onClick={() => selectView("database")}
            type="button"
          >
            <Database className="size-4" />
          </button>
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
            className={`${controlClass} size-8 ${status === "Refreshing" ? "text-sky-300" : ""}`}
            onClick={refresh}
            type="button"
          >
            <RefreshCw
              className={`size-4 ${status === "Refreshing" ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      <div className="flex min-w-0 items-center justify-end gap-1">
        <div className="hidden items-center gap-1.5 rounded-full border border-sidebar-border/70 bg-background/20 px-2.5 py-1 text-[10px] font-medium text-muted-foreground lg:flex">
          <CheckCircle2 className="size-3 text-emerald-400" />
          <span>{status === "Refreshing" ? "Updating" : "Running"}</span>
        </div>
        <div className="relative" ref={moreMenuRef}>
          <button
            aria-label="More actions"
            aria-expanded={moreOpen}
            className={`${controlClass} size-8`}
            onClick={() => setMoreOpen((value) => !value)}
            type="button"
          >
            <MoreHorizontal className="size-[17px]" />
          </button>
          {moreOpen ? (
            <div className="absolute right-0 top-10 z-50 w-48 rounded-xl border border-border/70 bg-popover/95 p-1.5 text-xs text-popover-foreground shadow-2xl backdrop-blur-xl">
              <button
                className="block w-full rounded-lg px-2.5 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  setMoreOpen(false);
                  window.alert("Export du projet préparé.");
                }}
                type="button"
              >
                Download ZIP
              </button>
              <button
                className="block w-full rounded-lg px-2.5 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  setMoreOpen(false);
                  dispatch("idealy:show-console");
                }}
                type="button"
              >
                Show Console
              </button>
              <button
                className="block w-full rounded-lg px-2.5 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  setMoreOpen(false);
                  rename();
                }}
                type="button"
              >
                Rename project
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
          {isCanvasExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </button>
        <button
          aria-label="Collaboration"
          className={`${controlClass} hidden size-8 md:inline-flex`}
          onClick={() => window.alert("Collaboration disponible pour cette mission.")}
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
            <Sparkles className={`size-3.5 ${isSquadRunning ? "animate-pulse" : ""}`} />
            {isSquadRunning ? "Building" : "Run squad"}
          </button>
        ) : null}
        <button
          aria-label="Publish"
          className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-[11px] font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98]"
          onClick={() => window.alert("Publication de la preview préparée.")}
          type="button"
        >
          Publish
        </button>
      </div>
    </header>
  );
}
