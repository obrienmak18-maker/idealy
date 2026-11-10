import {
  AlertCircle,
  CheckCircle2,
  Code2,
  ExternalLink,
  FileCode2,
  FolderTree,
  Home,
  LoaderCircle,
  Maximize2,
  MessageSquarePlus,
  Minimize2,
  Monitor,
  MousePointer2,
  Play,
  RefreshCw,
  Smartphone,
  Square,
  Tablet,
  TerminalSquare,
  X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import { CodeBlock } from "../chat/CodeBlock";
import { getRuntimeAdapter, type AllowedCommand, type ProjectRuntimeAdapter, type RuntimeState } from "../../services/runtime";
import { PREVIEW_BRIDGE_SOURCE, preparePreviewRuntimeFiles } from "../../services/previewRuntimeFiles";
import {
  getConversationWorkspaceFiles,
  getLatestMissionForConversation,
  getPreviewRoutes,
} from "../../services/conversationWorkspace";

type WorkspaceTab = "preview" | "files" | "terminal" | "console" | "activity";
type Viewport = "desktop" | "tablet" | "mobile";
type PreviewConsoleEntry = { id: string; level: "error" | "warning"; message: string; time: string };
type InspectedElement = {
  classes: string;
  dimensions: { height: number; width: number };
  selector: string;
  tag: string;
  text: string;
};

const viewportWidths: Record<Viewport, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
};


function isHtmlDocument(content: string): boolean {
  return /<!doctype html|<html[\s>]|<body[\s>]/i.test(content);
}

function wrapHtml(content: string): string {
  const normalized = content.trim();
  const document = isHtmlDocument(normalized)
    ? normalized
    : `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${normalized}</body></html>`;
  if (document.includes('id="idealy-preview-bridge"')) return document;
  const bridge = `<script id="idealy-preview-bridge">${PREVIEW_BRIDGE_SOURCE}</script>`;
  if (/<\/body>/i.test(document)) return document.replace(/<\/body>/i, `${bridge}</body>`);
  return `${document}${bridge}`;
}

function stateLabel(state: RuntimeState, generationActive: boolean): string {
  if (generationActive) return "Mise à jour en cours";
  switch (state) {
    case "booting": return "Initialisation";
    case "installing": return "Installation des dépendances";
    case "starting": return "Démarrage du serveur";
    case "ready": return "En direct";
    case "stopped": return "Arrêté";
    case "unsupported": return "Runtime indisponible";
    case "error": return "Erreur runtime";
    default: return "En attente";
  }
}

export const SidecarPanel: React.FC = () => {
  const {
    activeArtifact,
    activeConversation,
    activeMessages,
    artifacts,
    generationStatus,
    setDraft,
  } = useApp();

  const conversationId = activeConversation?.id ?? null;
  const latestMission = useMemo(
    () => getLatestMissionForConversation(activeMessages, conversationId),
    [activeMessages, conversationId],
  );
  const projectFiles = useMemo(
    () => getConversationWorkspaceFiles(activeMessages, artifacts, conversationId),
    [activeMessages, artifacts, conversationId],
  );
  const routes = useMemo(() => getPreviewRoutes(projectFiles), [projectFiles]);
  const htmlFile = projectFiles.find((file) => /(^|\/)index\.html$/i.test(file.path));
  const htmlSource =
    htmlFile?.content ??
    (activeArtifact &&
    (activeArtifact.language?.toLowerCase() === "html" ||
      /<!doctype html|<html[\s>]|<body[\s>]/i.test(activeArtifact.content))
      ? activeArtifact.content
      : "");
  const hasManifest = projectFiles.some((file) => file.path === "package.json");
  const requiresProjectRuntime = Boolean(htmlSource) && (
    hasManifest ||
    /<script\b[^>]*(?:\bsrc\s*=|\btype\s*=\s*["']module["'])|<link\b[^>]*\bhref\s*=|<img\b[^>]*\bsrc\s*=/i.test(htmlSource)
  );
  const staticPreviewDocument = useMemo(
    () => (htmlSource && !requiresProjectRuntime ? wrapHtml(htmlSource) : ""),
    [htmlSource, requiresProjectRuntime],
  );
  const projectKey = latestMission?.id ?? conversationId ?? "empty";
  const previewRevision = projectFiles
    .map((file) => `${file.path}:${file.version ?? 0}:${file.checksum ?? file.content.length}:${file.status ?? "saved"}`)
    .sort()
    .join("|");
  const previewBuildKey = `${projectKey}:${previewRevision}`;
  const generationActive =
    generationStatus === "sending" || generationStatus === "receiving";

  const [tab, setTab] = useState<WorkspaceTab>("preview");
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [previewPath, setPreviewPath] = useState("/");
  const [previewKey, setPreviewKey] = useState(0);
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("idle");
  const [runtimeUrl, setRuntimeUrl] = useState("");
  const [runtimeError, setRuntimeError] = useState("");
  const [runtimeOutput, setRuntimeOutput] = useState("");
  const [consoleEntries, setConsoleEntries] = useState<PreviewConsoleEntry[]>([]);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [runningCheck, setRunningCheck] = useState<"build" | "typecheck" | null>(null);
  const [workspaceWidth, setWorkspaceWidth] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [inspectorMode, setInspectorMode] = useState<"off" | "select" | "comment">("off");
  const [inspectionIntent, setInspectionIntent] = useState<"select" | "comment">("select");
  const [inspected, setInspected] = useState<InspectedElement | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [selectedFilePath, setSelectedFilePath] = useState("");
  const [unsupportedReason, setUnsupportedReason] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const runtimeRef = useRef<ProjectRuntimeAdapter | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const generationRef = useRef(0);
  const autoStartedRef = useRef<string | null>(null);
  const resizeStartRef = useRef({ startX: 0, width: 0 });

  const selectedFile = projectFiles.find((file) => file.path === selectedFilePath);
  const activePreviewUrl = runtimeUrl
    ? `${runtimeUrl.replace(/\/$/, "")}${previewPath === "/" ? "/" : previewPath}`
    : "";
  const isStaticPreview = Boolean(staticPreviewDocument) && !runtimeUrl;
  const hasPreview = Boolean(runtimeUrl || staticPreviewDocument);
  const previewRuntimeFiles = useMemo(
    () => preparePreviewRuntimeFiles(projectFiles),
    [projectFiles],
  );
  const canUseVisualTools = isStaticPreview || (Boolean(runtimeUrl) && previewRuntimeFiles.enabled);

  useEffect(() => {
    const nextFile =
      projectFiles.find((file) => file.path === "src/App.tsx") ??
      projectFiles.find((file) => /(^|\/)index\.html$/i.test(file.path)) ??
      projectFiles[0];
    if (nextFile && !projectFiles.some((file) => file.path === selectedFilePath)) {
      setSelectedFilePath(nextFile.path);
    }
  }, [projectFiles, selectedFilePath]);

  useEffect(() => {
    setTab("preview");
    setViewport("desktop");
    setPreviewPath("/");
    setPreviewKey(0);
    setRuntimeState("idle");
    setRuntimeUrl("");
    setRuntimeError("");
    setRuntimeOutput("");
    setConsoleEntries([]);
    setTerminalOpen(false);
    setInspectorMode("off");
    setInspectionIntent("select");
    setInspected(null);
    setCommentDraft("");
    setUnsupportedReason("");
  }, [projectKey]);

  useEffect(() => {
    const openWorkspace = () => setIsMobileOpen(true);
    window.addEventListener("idealy:open-workspace", openWorkspace);
    return () => window.removeEventListener("idealy:open-workspace", openWorkspace);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const previousCursor = document.body.style.cursor;
    const previousSelection = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMove = (event: PointerEvent) => {
      const delta = resizeStartRef.current.startX - event.clientX;
      const maximum = Math.min(1100, Math.round(window.innerWidth * 0.72));
      const nextWidth = Math.max(460, Math.min(maximum, resizeStartRef.current.width + delta));
      setWorkspaceWidth(nextWidth);
    };
    const handleUp = () => setIsResizing(false);

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelection;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (!isExpanded && !isMobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsExpanded(false);
      setIsMobileOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isExpanded, isMobileOpen]);

  const appendOutput = useCallback((chunk: string) => {
    if (!chunk) return;
    setRuntimeOutput((current) => `${current}${chunk}`.slice(-18000));
  }, []);

  const stopPreview = useCallback(() => {
    generationRef.current += 1;
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    runtimeRef.current?.stopProcess();
    setRuntimeUrl("");
    setRuntimeState("stopped");
  }, []);

  const runDiagnostic = useCallback(async (command: AllowedCommand) => {
    const adapter = runtimeRef.current;
    if (!adapter?.getActiveSession() || runtimeUrl) {
      setRuntimeError("Arrête d’abord le serveur de prévisualisation avant de lancer une vérification.");
      return;
    }

    setRuntimeError("");
    setRunningCheck(command.kind === "tsc-noemit" ? "typecheck" : "build");
    setTab("terminal");
    try {
      const result = await adapter.executeCommand(command);
      if (result.exitCode === 0) {
        appendOutput("\\nVérification locale terminée · code 0.\\n");
      } else {
        setRuntimeError(
          `La vérification s’est terminée avec le code ${result.exitCode}. Consulte la sortie du terminal.`,
        );
      }
    } catch (cause) {
      setRuntimeError(
        cause instanceof Error ? cause.message : "La vérification n’a pas pu être exécutée.",
      );
    } finally {
      setRunningCheck(null);
    }
  }, [appendOutput, runtimeUrl]);

  const startPreview = useCallback(async () => {
    if (!hasManifest || !projectFiles.length) {
      setRuntimeError("Le projet doit contenir un package.json à sa racine pour démarrer un aperçu Node.js.");
      setTab("files");
      return;
    }

    const generation = ++generationRef.current;
    setRuntimeError("");
    setUnsupportedReason("");
    setRuntimeOutput("");
    setRuntimeUrl("");
    setRuntimeState("booting");
    setTab("preview");
    setTerminalOpen(true);

    try {
      const adapter = getRuntimeAdapter("webcontainer");
      const support = adapter.isSupported();
      if (!support.supported) {
        setUnsupportedReason(support.reason ?? "Ce navigateur ne prend pas en charge le runtime WebContainer.");
        setRuntimeState("unsupported");
        return;
      }

      unsubscribeRef.current?.();
      unsubscribeRef.current = adapter.subscribe((event) => {
        if (generation !== generationRef.current) return;
        if (event.type === "runtime.state") {
          const state = event.payload.state;
          if (
            state === "idle" || state === "booting" || state === "installing" ||
            state === "starting" || state === "ready" || state === "stopped" || state === "error"
          ) setRuntimeState(state);
        }
        if (event.type === "terminal.command" && typeof event.payload.command === "string") {
          appendOutput(`\n$ ${event.payload.command}\n`);
        }
        if (event.type === "terminal.output" && typeof event.payload.chunk === "string") {
          appendOutput(event.payload.chunk);
        }
      });
      runtimeRef.current = adapter;

      await adapter.destroySession();
      if (generation !== generationRef.current) return;
      await adapter.createSession(projectKey);
      if (generation !== generationRef.current) return;
      await adapter.mountProject(previewRuntimeFiles.files);
      if (generation !== generationRef.current) return;
      const result = await adapter.startDevServer();
      if (generation !== generationRef.current) {
        adapter.stopProcess();
        return;
      }
      setRuntimeUrl(result.url);
      setRuntimeState("ready");
      setPreviewKey((current) => current + 1);
    } catch (cause) {
      if (generation !== generationRef.current) return;
      const message =
        cause instanceof Error ? cause.message : "L’aperçu interactif n’a pas pu démarrer.";
      setRuntimeError(message);
      setRuntimeState("error");
    }
  }, [appendOutput, hasManifest, previewRuntimeFiles.files, projectFiles.length, projectKey]);

  useEffect(() => {
    if (
      latestMission?.status !== "ready" ||
      !hasManifest ||
      autoStartedRef.current === previewBuildKey
    ) return;
    autoStartedRef.current = previewBuildKey;
    void startPreview();
  }, [hasManifest, latestMission?.status, previewBuildKey, startPreview]);

  useEffect(() => {
    return () => {
      generationRef.current += 1;
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      // Stop the process synchronously on navigation. The next conversation
      // reuses the singleton adapter but destroys and mounts its own session.
      runtimeRef.current?.stopProcess();
    };
  }, []);

  useEffect(() => {
    const handleFrameMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === "idealy:preview-error") {
        const level: PreviewConsoleEntry["level"] =
          event.data.level === "warning" ? "warning" : "error";
        const entry: PreviewConsoleEntry = {
          id: `${Date.now()}-${consoleEntries.length}`,
          level,
          message:
            typeof event.data.message === "string"
              ? event.data.message
              : "Erreur preview inconnue",
          time: new Date().toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        };
        setConsoleEntries((current) => [...current, entry].slice(-200));
        return;
      }
      if (event.data?.type !== "idealy:preview-element") return;
      setInspected({
        classes: typeof event.data.classes === "string" ? event.data.classes : "",
        dimensions: {
          height: Number(event.data.dimensions?.height) || 0,
          width: Number(event.data.dimensions?.width) || 0,
        },
        selector: typeof event.data.selector === "string" ? event.data.selector : "élément",
        tag: typeof event.data.tag === "string" ? event.data.tag : "element",
        text: typeof event.data.text === "string" ? event.data.text : "",
      });
      setInspectionIntent(event.data.mode === "comment" ? "comment" : "select");
      setCommentDraft("");
      setInspectorMode("off");
    };
    window.addEventListener("message", handleFrameMessage);
    return () => window.removeEventListener("message", handleFrameMessage);
  }, []);

  const postInspectorMode = useCallback((mode: "off" | "select" | "comment") => {
    iframeRef.current?.contentWindow?.postMessage({ type: "idealy:preview-mode", mode }, "*");
  }, []);

  useEffect(() => {
    postInspectorMode(inspectorMode);
  }, [inspectorMode, postInspectorMode, previewKey]);

  const requestEdit = useCallback(() => {
    if (!inspected) return;
    const visualComment = commentDraft.trim();
    if (inspectionIntent === "comment" && !visualComment) return;
    const task =
      inspectionIntent === "comment"
        ? "Applique ce commentaire visuel"
        : "Modifie cet élément";
    const context = [
      `${task} dans l’application générée :`,
      `- Sélecteur : ${inspected.selector}`,
      `- Élément : <${inspected.tag}>`,
      inspected.text ? `- Texte actuel : ${inspected.text}` : "",
      `- Dimensions : ${inspected.dimensions.width} × ${inspected.dimensions.height}px`,
      visualComment ? `- Commentaire : ${visualComment}` : "",
      "Demande : ",
    ].filter(Boolean).join("\n");
    setDraft(context);
    setCommentDraft("");
    setIsMobileOpen(false);
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLTextAreaElement>("[data-composer-input]")?.focus();
    });
  }, [commentDraft, inspected, inspectionIntent, setDraft]);

  const openPreview = useCallback(() => {
    if (activePreviewUrl) {
      window.open(activePreviewUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (staticPreviewDocument) {
      const blob = new Blob([staticPreviewDocument], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  }, [activePreviewUrl, staticPreviewDocument]);

  const selectTab = (next: WorkspaceTab) => {
    setTab(next);
    if (next !== "preview") setInspectorMode("off");
  };

  const isBusy =
    runtimeState === "booting" ||
    runtimeState === "installing" ||
    runtimeState === "starting";
  const statusText = stateLabel(runtimeState, generationActive);
  const previewFrameStyle: React.CSSProperties = {
    width: viewportWidths[viewport],
    height: "100%",
    flex: viewport === "desktop" ? "1 1 auto" : "0 0 auto",
  };

  const closeOverlay = () => {
    setIsExpanded(false);
    setIsMobileOpen(false);
  };

  const panelClass = isExpanded || isMobileOpen
    ? "fixed inset-0 z-50 flex h-dvh w-full flex-col bg-bg-base shadow-elevated"
    : "relative hidden h-full min-h-0 w-[clamp(480px,46vw,880px)] shrink-0 flex-col border-l border-border-subtle bg-bg-base xl:flex";

  const panelStyle: React.CSSProperties | undefined =
    !isExpanded && !isMobileOpen && workspaceWidth !== null
      ? { width: `${workspaceWidth}px` }
      : undefined;

  const resizeWorkspace = (direction: -1 | 1) => {
    const current = workspaceWidth ?? Math.min(880, Math.max(480, Math.round(window.innerWidth * 0.46)));
    const maximum = Math.min(1100, Math.round(window.innerWidth * 0.72));
    setWorkspaceWidth(Math.max(460, Math.min(maximum, current + direction * 24)));
  };

  const handleResizeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      resizeWorkspace(1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      resizeWorkspace(-1);
    }
  };

  const statusIcon =
    runtimeState === "ready" ? (
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
    ) : runtimeState === "error" || runtimeState === "unsupported" ? (
      <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
    ) : isBusy || generationActive ? (
      <LoaderCircle className="h-3.5 w-3.5 animate-spin text-brand-primary" />
    ) : (
      <span className="h-2 w-2 rounded-full bg-text-muted/40" />
    );

  return (
    <aside
      aria-label="Espace de prévisualisation et de création"
      className={`${panelClass} ${isResizing ? "select-none" : ""}`}
      style={panelStyle}
    >
      {!isExpanded && !isMobileOpen && (
        <div
          aria-label="Redimensionner le chat et la prévisualisation"
          aria-orientation="vertical"
          aria-valuemax={1100}
          aria-valuemin={460}
          aria-valuenow={workspaceWidth ?? Math.min(880, Math.max(480, Math.round(window.innerWidth * 0.46)))}
          className="absolute inset-y-0 -left-1.5 z-40 hidden w-3 cursor-col-resize items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary xl:flex"
          onKeyDown={handleResizeKeyDown}
          onPointerDown={(event) => {
            event.preventDefault();
            resizeStartRef.current = {
              startX: event.clientX,
              width: event.currentTarget.parentElement?.getBoundingClientRect().width ?? 640,
            };
            setIsResizing(true);
          }}
          role="separator"
          tabIndex={0}
        >
          <span className="h-12 w-1 rounded-full bg-border-subtle transition-colors group-hover:bg-brand-primary/60" />
        </div>
      )}
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border-subtle px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-border-subtle bg-bg-surface text-brand-primary">
            <FileCode2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-xs font-semibold text-text-main">
                {activeConversation?.title || "Workspace"}
              </h2>
              <span className="hidden rounded-full border border-border-subtle px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-text-muted 2xl:inline">
                IDEALY STUDIO
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-text-muted">
              {statusIcon}
              <span>{statusText}</span>
              {projectFiles.length > 0 && <span>· {projectFiles.length} fichiers</span>}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            aria-label={isExpanded ? "Réduire l’espace de travail" : "Agrandir l’espace de travail"}
            className="grid h-8 w-8 place-items-center rounded-lg text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-main focus-ring"
            onClick={() => setIsExpanded((current) => !current)}
            type="button"
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          {(isMobileOpen || isExpanded) && (
            <button
              aria-label="Fermer l’espace de travail"
              className="grid h-8 w-8 place-items-center rounded-lg text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-main focus-ring"
              onClick={closeOverlay}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border-subtle bg-bg-surface/70 px-3">
        <nav aria-label="Outils du workspace" className="flex min-w-0 items-center gap-1">
          {([
            { id: "preview", label: "Aperçu", icon: Monitor },
            { id: "files", label: "Code", icon: Code2 },
            { id: "terminal", label: "Terminal", icon: TerminalSquare },
            { id: "console", label: "Console", icon: AlertCircle },
            { id: "activity", label: "Activité", icon: FolderTree },
          ] as const).map((item) => {
            const Icon = item.icon;
            return (
              <button
                aria-current={tab === item.id ? "page" : undefined}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-medium transition-colors focus-ring ${tab === item.id ? "bg-bg-subtle text-text-main shadow-subtle" : "text-text-muted hover:bg-bg-subtle/60 hover:text-text-main"}`}
                key={item.id}
                onClick={() => selectTab(item.id)}
                type="button"
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <span className="shrink-0 text-[10px] tabular-nums text-text-muted">
          {projectFiles.length ? `${projectFiles.length} fichiers` : "Nouveau projet"}
        </span>
      </div>

      {tab === "preview" && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-11 shrink-0 items-center justify-between gap-2 border-b border-border-subtle px-3">
            <div className="flex min-w-0 items-center gap-1">
              <div className="mr-1 hidden items-center gap-1 text-[10px] text-text-muted sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Preview</span>
              </div>
              {canUseVisualTools && (
                <>
                  <button
                    aria-pressed={inspectorMode === "select"}
                    className={`grid h-8 w-8 place-items-center rounded-lg transition-colors focus-ring ${inspectorMode === "select" ? "bg-brand-primary/10 text-brand-primary" : "text-text-muted hover:bg-bg-subtle hover:text-text-main"}`}
                    onClick={() => setInspectorMode((current) => current === "select" ? "off" : "select")}
                    title="Sélectionner un élément dans la preview"
                    type="button"
                  >
                    <MousePointer2 className="h-4 w-4" />
                  </button>
                  <button
                    aria-pressed={inspectorMode === "comment"}
                    className={`grid h-8 w-8 place-items-center rounded-lg transition-colors focus-ring ${inspectorMode === "comment" ? "bg-brand-primary/10 text-brand-primary" : "text-text-muted hover:bg-bg-subtle hover:text-text-main"}`}
                    onClick={() => setInspectorMode((current) => current === "comment" ? "off" : "comment")}
                    title="Commenter un élément de la preview"
                    type="button"
                  >
                    <MessageSquarePlus className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <div className="mr-1 flex items-center rounded-lg border border-border-subtle bg-bg-base p-0.5">
                {([
                  { id: "desktop", icon: Monitor, label: "Bureau" },
                  { id: "tablet", icon: Tablet, label: "Tablette" },
                  { id: "mobile", icon: Smartphone, label: "Mobile" },
                ] as const).map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      aria-label={item.label}
                      aria-pressed={viewport === item.id}
                      className={`grid h-7 w-7 place-items-center rounded-md transition-colors focus-ring ${viewport === item.id ? "bg-bg-subtle text-text-main shadow-subtle" : "text-text-muted hover:text-text-main"}`}
                      key={item.id}
                      onClick={() => setViewport(item.id)}
                      type="button"
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  );
                })}
              </div>
              <button
                aria-label="Recharger l’aperçu"
                className="grid h-8 w-8 place-items-center rounded-lg text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-main focus-ring"
                onClick={() => setPreviewKey((current) => current + 1)}
                type="button"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                aria-label="Ouvrir l’aperçu dans un nouvel onglet"
                className="grid h-8 w-8 place-items-center rounded-lg text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-main focus-ring disabled:cursor-not-allowed disabled:opacity-30"
                disabled={!hasPreview}
                onClick={openPreview}
                type="button"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {routes.length > 1 && runtimeUrl && (
            <div className="flex min-h-9 shrink-0 items-center gap-2 border-b border-border-subtle px-3">
              <Home className="h-3 w-3 text-text-muted" />
              <select
                aria-label="Page de l’application"
                className="h-8 max-w-[220px] rounded-lg bg-transparent px-2 text-[11px] text-text-main outline-none focus:ring-1 focus:ring-brand-primary"
                onChange={(event) => setPreviewPath(event.target.value)}
                value={previewPath}
              >
                {routes.map((route) => (
                  <option key={route.path} value={route.path}>{route.label}</option>
                ))}
              </select>
              <span className="ml-auto truncate font-mono text-[10px] text-text-muted">{previewPath}</span>
            </div>
          )}

          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[radial-gradient(ellipse_at_center,var(--dsw-alias-bg-layer-2),var(--dsw-alias-bg-base)_75%)] p-2 sm:p-4">
            {hasPreview ? (
              <div
                className={`h-full min-h-0 shrink-0 overflow-hidden border border-border-subtle bg-white shadow-[0_14px_50px_-18px_rgba(0,0,0,0.35)] transition-[width] duration-300 ${viewport === "mobile" ? "rounded-[2rem] border-[8px] border-[#17191e]" : viewport === "tablet" ? "rounded-2xl" : "rounded-xl"}`}
                style={previewFrameStyle}
              >
                <iframe
                  key={previewKey}
                  allow="cross-origin-isolated"
                  className="h-full w-full border-0 bg-white"
                  onLoad={() => postInspectorMode(inspectorMode)}
                  ref={iframeRef}
                  referrerPolicy="no-referrer"
                  sandbox={runtimeUrl ? "allow-scripts allow-forms allow-modals allow-same-origin" : "allow-scripts allow-forms allow-modals"}
                  src={runtimeUrl ? activePreviewUrl : undefined}
                  srcDoc={!runtimeUrl ? staticPreviewDocument : undefined}
                  title={`Aperçu interactif — ${activeConversation?.title ?? "Idealy"}`}
                />
              </div>
            ) : (
              <div className="mx-auto flex max-w-sm flex-col items-center px-5 py-10 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-2xl border border-border-subtle bg-bg-surface text-brand-primary shadow-subtle">
                  {generationActive || isBusy
                    ? <LoaderCircle className="h-6 w-6 animate-spin" />
                    : <FileCode2 className="h-6 w-6" />}
                </div>
                <h3 className="mt-5 text-sm font-semibold text-text-main">
                  {generationActive ? "Votre application prend forme" : "Votre espace de création"}
                </h3>
                <p className="mt-2 text-xs leading-5 text-text-muted">
                  {generationActive
                    ? "Les fichiers, l’aperçu interactif et les outils de contrôle apparaîtront ici au fil de la construction."
                    : "Décrivez l’application à créer dans le chat. Idealy affichera ici le résultat, le code source et les diagnostics du projet."}
                </p>
                {hasManifest && (
                  <button
                    className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-brand-primary px-3 text-xs font-semibold text-brand-onPrimary hover:opacity-90 focus-ring"
                    onClick={() => void startPreview()}
                    type="button"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Lancer l’aperçu
                  </button>
                )}
              </div>
            )}
            {inspectorMode !== "off" && (
              <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-brand-primary/25 bg-bg-base/90 px-3 py-2 text-[10px] font-medium text-brand-primary shadow-subtle backdrop-blur">
                Cliquez sur un élément de l’application pour le sélectionner
              </div>
            )}
          </div>

          {inspected && (
            <div className="flex shrink-0 flex-col gap-2 border-t border-border-subtle bg-bg-surface px-3 py-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-text-main">
                  <span className="font-mono text-brand-primary">&lt;{inspected.selector}&gt;</span>
                  <span className="text-text-muted">{inspected.dimensions.width} × {inspected.dimensions.height}px</span>
                </div>
                {inspected.text && <p className="mt-0.5 truncate text-[10px] text-text-muted">{inspected.text}</p>}
                {inspectionIntent === "comment" && (
                  <textarea
                    aria-label="Commentaire sur l’élément sélectionné"
                    className="mt-2 min-h-12 w-full resize-y rounded-lg border border-border-subtle bg-bg-base px-3 py-2 text-xs text-text-main outline-none placeholder:text-text-muted focus:border-brand-primary/60 focus:ring-2 focus:ring-brand-primary/15"
                    onChange={(event) => setCommentDraft(event.target.value)}
                    placeholder="Décris ce qui doit changer sur cet élément…"
                    rows={2}
                    value={commentDraft}
                  />
                )}
              </div>
              <button
                className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 self-end rounded-lg bg-brand-primary px-3 text-[11px] font-semibold text-brand-onPrimary transition-opacity hover:opacity-90 focus-ring disabled:cursor-not-allowed disabled:opacity-40 sm:self-auto"
                disabled={inspectionIntent === "comment" && !commentDraft.trim()}
                onClick={requestEdit}
                type="button"
              >
                <MessageSquarePlus className="h-3.5 w-3.5" />
                {inspectionIntent === "comment" ? "Envoyer le commentaire" : "Demander une modification"}
              </button>
            </div>
          )}

          {terminalOpen && runtimeOutput && (
            <div className="max-h-44 shrink-0 border-t border-border-subtle bg-[#111318]">
              <div className="flex h-8 items-center gap-2 border-b border-white/[0.08] px-3 text-[10px] text-white/70">
                <TerminalSquare className="h-3.5 w-3.5" />
                Terminal de construction
                <span className="ml-auto">{isBusy ? "En cours" : runtimeState === "ready" ? "Serveur prêt" : "Sortie"}</span>
                <button
                  aria-label="Masquer le terminal"
                  className="grid h-6 w-6 place-items-center rounded text-white/55 hover:bg-white/10 hover:text-white"
                  onClick={() => setTerminalOpen(false)}
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <pre className="max-h-36 overflow-auto whitespace-pre-wrap break-words px-3 py-2 font-mono text-[10px] leading-4 text-white/75">
                {runtimeOutput}
              </pre>
            </div>
          )}

          <footer className="flex min-h-9 shrink-0 items-center justify-between gap-3 border-t border-border-subtle px-3 text-[10px] text-text-muted">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate">{runtimeUrl ? "WebContainer · Node.js dans le navigateur" : isStaticPreview ? "Aperçu HTML isolé" : "Workspace prêt"}</span>
              {unsupportedReason && <span className="truncate text-amber-500">{unsupportedReason}</span>}
            </div>
            <button
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-medium text-text-muted hover:bg-bg-subtle hover:text-text-main focus-ring disabled:opacity-40"
              disabled={!hasManifest}
              onClick={() => {
                if (isBusy) stopPreview();
                else void startPreview();
              }}
              type="button"
            >
              {isBusy ? <Square className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3" />}
              {isBusy ? "Arrêter" : runtimeUrl ? "Redémarrer" : "Lancer"}
            </button>
          </footer>
        </div>
      )}

      {tab === "files" && (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(132px,0.34fr)_minmax(0,1fr)]">
          <nav aria-label="Fichiers du projet" className="min-h-0 overflow-y-auto border-r border-border-subtle p-2">
            {projectFiles.length ? projectFiles.map((file) => (
              <button
                aria-current={selectedFilePath === file.path ? "page" : undefined}
                className={`flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-[10px] transition-colors focus-ring ${selectedFilePath === file.path ? "bg-bg-subtle text-text-main" : "text-text-muted hover:bg-bg-surface hover:text-text-main"}`}
                key={file.path}
                onClick={() => setSelectedFilePath(file.path)}
                type="button"
              >
                <FileCode2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{file.path}</span>
              </button>
            )) : (
              <p className="px-2 py-3 text-[10px] text-text-muted">Les fichiers apparaîtront ici.</p>
            )}
          </nav>
          <div className="min-h-0 overflow-auto p-3">
            {selectedFile ? (
              <>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-[10px] text-text-muted">{selectedFile.path}</span>
                  <span className="shrink-0 text-[9px] text-text-muted">{selectedFile.content.length.toLocaleString("fr-FR")} caractères</span>
                </div>
                <CodeBlock
                  code={selectedFile.content}
                  language={selectedFile.language ?? selectedFile.path.split(".").pop() ?? "text"}
                />
              </>
            ) : (
              <div className="grid h-full place-items-center text-xs text-text-muted">
                Aucun fichier source disponible pour cette conversation.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "terminal" && (
        <section className="flex min-h-0 flex-1 flex-col bg-[#111318] text-zinc-100">
          <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/10 px-4 text-xs text-zinc-300">
            <TerminalSquare className="h-4 w-4" />
            Terminal de construction
            <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
              {runningCheck ? "Vérification…" : isBusy ? "En cours" : runtimeState === "ready" ? "Serveur actif" : "En attente"}
            </span>
            <button
              className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-zinc-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!runtimeRef.current?.getActiveSession() || Boolean(runtimeUrl) || Boolean(runningCheck)}
              onClick={() => void runDiagnostic({ kind: "npm-run", script: "build" })}
              type="button"
            >
              Build
            </button>
            <button
              className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-zinc-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!runtimeRef.current?.getActiveSession() || Boolean(runtimeUrl) || Boolean(runningCheck)}
              onClick={() => void runDiagnostic({ kind: "tsc-noemit" })}
              type="button"
            >
              Typecheck
            </button>
          </div>
          <pre aria-live="polite" className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-[11px] leading-5 text-zinc-300">
            {runtimeOutput || runtimeError || unsupportedReason || "Les commandes et sorties du runtime apparaîtront ici pendant la construction du projet."}
          </pre>
          {runtimeError && <p className="border-t border-amber-500/20 bg-amber-500/5 px-4 py-2 text-[11px] text-amber-400">{runtimeError}</p>}
        </section>
      )}

      {tab === "console" && (
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-bg-base">
          <header className="flex h-10 shrink-0 items-center justify-between border-b border-border-subtle px-4">
            <div className="flex items-center gap-2 text-xs font-medium text-text-main">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              Console de l’application
              <span className="rounded-full bg-bg-subtle px-2 py-0.5 text-[10px] text-text-muted">
                {consoleEntries.length}
              </span>
            </div>
            <button
              className="rounded-md px-2.5 py-1 text-[10px] text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-main focus-ring"
              onClick={() => setConsoleEntries([])}
              type="button"
            >
              Effacer
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-3 font-mono text-[10px] leading-5">
            {consoleEntries.length ? (
              <ol className="space-y-1.5">
                {consoleEntries.map((entry) => (
                  <li
                    className={`rounded-lg border px-3 py-2 ${entry.level === "error" ? "border-rose-500/20 bg-rose-500/5 text-rose-400" : "border-amber-500/20 bg-amber-500/5 text-amber-500"}`}
                    key={entry.id}
                  >
                    <div className="mb-1 flex items-center gap-2 opacity-70">
                      <span>{entry.level === "error" ? "ERREUR" : "AVERTISSEMENT"}</span>
                      <span>{entry.time}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-words">{entry.message}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="grid h-full place-items-center text-center text-xs text-text-muted">
                Aucune erreur d’exécution capturée. Les erreurs JavaScript et avertissements de la preview apparaîtront ici.
              </div>
            )}
          </div>
        </section>
      )}

      {tab === "activity" && (
        <section className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="mb-4 rounded-xl border border-border-subtle bg-bg-surface p-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-muted">Mission active</p>
            <p className="mt-1 truncate text-sm font-semibold text-text-main">{latestMission?.plan.projectKind || activeConversation?.title || "Nouvelle application"}</p>
            <p className="mt-1 text-[11px] leading-5 text-text-muted">{latestMission?.plan.intention || "La mission et les étapes de construction seront visibles ici."}</p>
          </div>
          {latestMission?.plan.agents.length ? (
            <ol className="space-y-2">
              {latestMission.plan.agents.map((agent, index) => (
                <li className="flex gap-3 rounded-xl border border-border-subtle bg-bg-surface p-3" key={agent.name}>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-bg-subtle text-[10px] font-semibold text-text-muted">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-text-main">{agent.name}</p>
                    <p className="mt-0.5 text-[10px] text-text-muted">{agent.responsibility}</p>
                    {agent.result && <p className="mt-2 text-[10px] leading-4 text-text-muted">{agent.result}</p>}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="py-6 text-center text-xs text-text-muted">
              Les étapes et les agents mobilisés pour cette conversation apparaîtront ici.
            </p>
          )}
          {latestMission?.error && (
            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-amber-500">
              {latestMission.error}
            </div>
          )}
        </section>
      )}
    </aside>
  );
};
