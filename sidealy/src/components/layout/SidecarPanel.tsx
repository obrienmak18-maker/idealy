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
import { getRuntimeAdapter, type ProjectRuntimeAdapter, type RuntimeState } from "../../services/runtime";
import {
  getConversationWorkspaceFiles,
  getLatestMissionForConversation,
  getPreviewRoutes,
} from "../../services/conversationWorkspace";

type WorkspaceTab = "preview" | "files" | "terminal" | "activity";
type Viewport = "desktop" | "tablet" | "mobile";
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

const previewBridge = `
<script id="idealy-preview-bridge">
(function () {
  let mode = "off";
  let highlight = null;
  let lastTarget = null;

  function ensureHighlight() {
    if (highlight || !document.body) return;
    highlight = document.createElement("div");
    highlight.id = "__idealy_preview_highlight";
    highlight.style.cssText = "position:fixed;z-index:2147483646;pointer-events:none;border:2px solid #5b7cfa;background:rgba(91,124,250,.10);border-radius:5px;display:none;transition:all 60ms ease-out";
    document.body.appendChild(highlight);
  }

  function selectorFor(element) {
    if (!element || element === document.body) return "body";
    if (element.id) return "#" + element.id;
    const classes = typeof element.className === "string"
      ? element.className.trim().split(/\\s+/).filter(Boolean).slice(0, 2)
      : [];
    return element.tagName.toLowerCase() + classes.map(function (name) {
      return "." + name.replace(/[^a-zA-Z0-9_-]/g, "");
    }).join("");
  }

  function setMode(nextMode) {
    mode = nextMode === "select" || nextMode === "comment" ? nextMode : "off";
    ensureHighlight();
    if (highlight) highlight.style.display = "none";
    document.documentElement.style.cursor = mode === "off" ? "" : "crosshair";
  }

  window.addEventListener("message", function (event) {
    if (event.source !== window.parent || !event.data || event.data.type !== "idealy:preview-mode") return;
    setMode(event.data.mode);
  });

  document.addEventListener("pointerover", function (event) {
    if (mode === "off") return;
    const element = event.target;
    if (!(element instanceof Element) || element === highlight) return;
    ensureHighlight();
    const rect = element.getBoundingClientRect();
    highlight.style.display = "block";
    highlight.style.top = rect.top + "px";
    highlight.style.left = rect.left + "px";
    highlight.style.width = rect.width + "px";
    highlight.style.height = rect.height + "px";
    lastTarget = element;
  }, true);

  document.addEventListener("click", function (event) {
    if (mode === "off") return;
    const element = event.target;
    if (!(element instanceof Element) || element === highlight) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = element.getBoundingClientRect();
    window.parent.postMessage({
      type: "idealy:preview-element",
      mode: mode,
      tag: element.tagName.toLowerCase(),
      selector: selectorFor(element),
      classes: typeof element.className === "string" ? element.className.slice(0, 160) : "",
      text: (element.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 140),
      dimensions: { width: Math.round(rect.width), height: Math.round(rect.height) }
    }, "*");
    setMode("off");
  }, true);
})();
</script>
`;

function isHtmlDocument(content: string): boolean {
  return /<!doctype html|<html[\s>]|<body[\s>]/i.test(content);
}

function wrapHtml(content: string): string {
  const normalized = content.trim();
  const document = isHtmlDocument(normalized)
    ? normalized
    : `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${normalized}</body></html>`;
  if (document.includes('id="idealy-preview-bridge"')) return document;
  if (/<\/body>/i.test(document)) return document.replace(/<\/body>/i, `${previewBridge}</body>`);
  return `${document}${previewBridge}`;
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
    closeArtifact,
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
  const staticPreviewDocument = useMemo(
    () => (htmlSource ? wrapHtml(htmlSource) : ""),
    [htmlSource],
  );
  const hasManifest = projectFiles.some((file) => file.path === "package.json");
  const projectKey = latestMission?.id ?? conversationId ?? "empty";
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
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [inspectorMode, setInspectorMode] = useState<"off" | "select" | "comment">("off");
  const [inspectionIntent, setInspectionIntent] = useState<"select" | "comment">("select");
  const [inspected, setInspected] = useState<InspectedElement | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState("");
  const [unsupportedReason, setUnsupportedReason] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const runtimeRef = useRef<ProjectRuntimeAdapter | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const generationRef = useRef(0);
  const autoStartedRef = useRef<string | null>(null);

  const selectedFile = projectFiles.find((file) => file.path === selectedFilePath);
  const activePreviewUrl = runtimeUrl
    ? `${runtimeUrl.replace(/\/$/, "")}${previewPath === "/" ? "/" : previewPath}`
    : "";
  const isStaticPreview = Boolean(staticPreviewDocument) && !runtimeUrl;
  const hasPreview = Boolean(runtimeUrl || staticPreviewDocument);
  const canUseVisualTools = isStaticPreview;

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
    setTerminalOpen(false);
    setInspectorMode("off");
    setInspectionIntent("select");
    setInspected(null);
    setUnsupportedReason("");
  }, [projectKey]);

  useEffect(() => {
    const openWorkspace = () => setIsMobileOpen(true);
    window.addEventListener("idealy:open-workspace", openWorkspace);
    return () => window.removeEventListener("idealy:open-workspace", openWorkspace);
  }, []);

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
      await adapter.mountProject(projectFiles);
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
  }, [appendOutput, hasManifest, projectFiles, projectKey]);

  useEffect(() => {
    if (
      latestMission?.status !== "ready" ||
      !hasManifest ||
      autoStartedRef.current === projectKey
    ) return;
    autoStartedRef.current = projectKey;
    void startPreview();
  }, [hasManifest, latestMission?.status, projectKey, startPreview]);

  useEffect(() => {
    return () => {
      generationRef.current += 1;
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      runtimeRef.current?.stopProcess();
      void runtimeRef.current?.destroySession();
    };
  }, []);

  useEffect(() => {
    const handleFrameMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
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
    const task =
      inspectionIntent === "comment"
        ? "Prends en compte ce commentaire visuel"
        : "Modifie cet élément";
    const context = [
      `${task} dans l’application générée :`,
      `- Sélecteur : ${inspected.selector}`,
      `- Élément : <${inspected.tag}>`,
      inspected.text ? `- Texte actuel : ${inspected.text}` : "",
      `- Dimensions : ${inspected.dimensions.width} × ${inspected.dimensions.height}px`,
      "Demande : ",
    ].filter(Boolean).join("\n");
    setDraft(context);
    setIsMobileOpen(false);
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLTextAreaElement>("[data-composer-input]")?.focus();
    });
  }, [inspected, inspectionIntent, setDraft]);

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

  const isBusy = ["booting", "installing", "starting"].includes(runtimeState);
  const statusText = stateLabel(runtimeState, generationActive);
  const previewFrameStyle = {
    width: viewportWidths[viewport],
    maxWidth: "100%",
    height: "100%",
  };

  const closeOverlay = () => {
    setIsExpanded(false);
    setIsMobileOpen(false);
  };

  const panelClass = isExpanded || isMobileOpen
    ? "fixed inset-0 z-50 flex h-dvh w-full flex-col bg-bg-base shadow-elevated"
    : "relative hidden h-full min-h-0 w-[clamp(480px,46vw,880px)] shrink-0 flex-col border-l border-border-subtle bg-bg-base xl:flex";

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
    <aside aria-label="Espace de prévisualisation et de création" className={panelClass}>
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
          {activeArtifact && (
            <button
              aria-label="Fermer le livrable sélectionné"
              className="hidden h-8 w-8 place-items-center rounded-lg text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-main focus-ring 2xl:grid"
              onClick={closeArtifact}
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
                className="h-full min-h-0 overflow-hidden rounded-xl border border-border-subtle bg-white shadow-[0_14px_50px_-18px_rgba(0,0,0,0.35)] transition-[width] duration-300"
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
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border-subtle bg-bg-surface px-3 py-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-text-main">
                  <span className="font-mono text-brand-primary">&lt;{inspected.selector}&gt;</span>
                  <span className="text-text-muted">{inspected.dimensions.width} × {inspected.dimensions.height}px</span>
                </div>
                {inspected.text && <p className="mt-0.5 truncate text-[10px] text-text-muted">{inspected.text}</p>}
              </div>
              <button
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-brand-primary px-3 text-[11px] font-semibold text-brand-onPrimary hover:opacity-90 focus-ring"
                onClick={requestEdit}
                type="button"
              >
                <MessageSquarePlus className="h-3.5 w-3.5" />
                Envoyer au chat
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
              {isBusy ? "En cours" : runtimeState === "ready" ? "Serveur actif" : "En attente"}
            </span>
          </div>
          <pre aria-live="polite" className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-[11px] leading-5 text-zinc-300">
            {runtimeOutput || (runtimeError ? runtimeError : "Les commandes et sorties du runtime apparaîtront ici pendant la construction du projet.")}
          </pre>
          {runtimeError && <p className="border-t border-amber-500/20 bg-amber-500/5 px-4 py-2 text-[11px] text-amber-400">{runtimeError}</p>}
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
