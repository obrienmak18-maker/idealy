import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  CloudUpload,
  Code2,
  Copy,
  Database,
  ExternalLink,
  FileCode2,
  Folder,
  FolderOpen,
  FolderTree,
  Home,
  LoaderCircle,
  Maximize2,
  MessageSquarePlus,
  Minimize2,
  Monitor,
  MoreHorizontal,
  MousePointer2,
  Play,
  RefreshCw,
  Save,
  Search,
  Share2,
  Smartphone,
  Square,
  Tablet,
  TerminalSquare,
  X,
} from "lucide-react";
import type React from "react";
import type { MissionWorkspaceFile } from "../../types";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import { authenticatedFetch } from "../../services/firebase";
import {
  buildWorkspaceFileTree,
  listWorkspaceFolderPaths,
  type WorkspaceFileTreeNode,
} from "../../services/workspaceFileTree";
import { getRuntimeAdapter, type AllowedCommand, type ProjectRuntimeAdapter, type RuntimeState } from "../../services/runtime";
import { PREVIEW_BRIDGE_SOURCE, preparePreviewRuntimeFiles } from "../../services/previewRuntimeFiles";
import {
  getConversationWorkspaceFiles,
  getLatestMissionForConversation,
  getPreviewRoutes,
} from "../../services/conversationWorkspace";

const MissionWorkspaceModal = lazy(() =>
  import("../chat/MissionWorkspace").then((module) => ({
    default: module.MissionWorkspace,
  })),
);

type WorkspaceTab = "preview" | "files" | "database" | "terminal" | "console" | "activity";
type ExplorerMode = "files" | "search";
type MissionDatabaseSnapshot = {
  mission: {
    created_at: string | null;
    id: string;
    status: string | null;
    title: string | null;
    way: string | null;
  } | null;
  agentRuns: Array<{
    agent_key: string;
    completed_at: string | null;
    id: string;
    started_at: string | null;
    status: string;
    step_index: number;
  }>;
  events: Array<{
    created_at: string;
    event_type: string;
    id: string;
    path: string | null;
    sequence: number;
  }>;
  errors: {
    mission?: string | null;
    agentRuns?: string | null;
    events?: string | null;
  };
};
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
    updateArtifactContent,
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
  const fileTree = useMemo(() => buildWorkspaceFileTree(projectFiles), [projectFiles]);
  const folderSignature = useMemo(
    () => listWorkspaceFolderPaths(fileTree).join("\u0000"),
    [fileTree],
  );
  const [fileSearch, setFileSearch] = useState("");
  const searchableFiles = useMemo(() => {
    const query = fileSearch.trim().toLocaleLowerCase();
    if (!query) return projectFiles;
    return projectFiles.filter((file) =>
      file.path.toLocaleLowerCase().includes(query) ||
      file.content.toLocaleLowerCase().includes(query),
    );
  }, [fileSearch, projectFiles]);
  const generationActive =
    generationStatus === "sending" || generationStatus === "receiving";

  const [tab, setTab] = useState<WorkspaceTab>("preview");
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [explorerMode, setExplorerMode] = useState<ExplorerMode>("files");
  const [openFolders, setOpenFolders] = useState<Set<string>>(() => new Set());
  const [moreToolsOpen, setMoreToolsOpen] = useState(false);
  const [isPublishWorkspaceOpen, setIsPublishWorkspaceOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [previewPathDraft, setPreviewPathDraft] = useState("/");
  const [terminalHeight, setTerminalHeight] = useState(220);
  const [isResizingTerminal, setIsResizingTerminal] = useState(false);
  const [databaseSnapshot, setDatabaseSnapshot] = useState<{
    missionId: string;
    data: MissionDatabaseSnapshot;
  } | null>(null);
  const [databaseLoading, setDatabaseLoading] = useState(false);
  const [databaseError, setDatabaseError] = useState("");
  const databaseLoadKeyRef = useRef<string | null>(null);
  const moreToolsRef = useRef<HTMLDivElement>(null);
  const terminalResizeStartRef = useRef({ startY: 0, height: 220 });
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
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [editorDraft, setEditorDraft] = useState("");
  const [isSavingFile, setIsSavingFile] = useState(false);
  const [fileSaveNotice, setFileSaveNotice] = useState("");
  const [fileSaveError, setFileSaveError] = useState("");
  const [unsupportedReason, setUnsupportedReason] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const runtimeRef = useRef<ProjectRuntimeAdapter | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const generationRef = useRef(0);
  const autoStartedRef = useRef<string | null>(null);
  const resizeStartRef = useRef({ startX: 0, width: 0 });

  const selectedFile = projectFiles.find((file) => file.path === selectedFilePath);
  const editorDirty = selectedFile ? editorDraft !== selectedFile.content : false;
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
    setEditorDraft(selectedFile?.content ?? "");
    setFileSaveNotice("");
    setFileSaveError("");
  }, [selectedFile?.path, selectedFile?.version, selectedFile?.content]);


  useEffect(() => {
    setTab("preview");
    setViewport("desktop");
    setPreviewPath("/");
    setPreviewPathDraft("/");
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
    setExplorerMode("files");
    setFileSearch("");
    setOpenFolders(new Set());
    setMoreToolsOpen(false);
    setIsPublishWorkspaceOpen(false);
    setShareStatus("");
    setDatabaseSnapshot(null);
    setDatabaseError("");
    databaseLoadKeyRef.current = null;
  }, [projectKey]);

  useEffect(() => {
    setOpenFolders(new Set(folderSignature ? folderSignature.split("\u0000") : []));
  }, [projectKey, folderSignature]);

  useEffect(() => {
    setPreviewPathDraft(previewPath);
  }, [previewPath]);

  useEffect(() => {
    const missionId = latestMission?.id;
    if (tab !== "database" || !missionId) return;
    if (databaseSnapshot?.missionId === missionId || databaseLoadKeyRef.current === missionId) return;

    const controller = new AbortController();
    databaseLoadKeyRef.current = missionId;
    setDatabaseLoading(true);
    setDatabaseError("");
    authenticatedFetch("/api/idealy/missions/" + encodeURIComponent(missionId) + "/database", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as MissionDatabaseSnapshot & { error?: string };
        if (!response.ok) throw new Error(payload.error || "La lecture des données de mission a échoué.");
        return payload;
      })
      .then((data) => {
        if (!controller.signal.aborted) setDatabaseSnapshot({ missionId, data });
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        databaseLoadKeyRef.current = null;
        setDatabaseError(cause instanceof Error ? cause.message : "Les données de mission ne sont pas disponibles.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setDatabaseLoading(false);
      });

    return () => controller.abort();
  }, [databaseSnapshot?.missionId, latestMission?.id, tab]);

  useEffect(() => {
    const openWorkspace = () => setIsMobileOpen(true);
    window.addEventListener("idealy:open-workspace", openWorkspace);
    return () => window.removeEventListener("idealy:open-workspace", openWorkspace);
  }, []);

  useEffect(() => {
    if (!isResizingTerminal) return;
    const previousCursor = document.body.style.cursor;
    const previousSelection = document.body.style.userSelect;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    const handleMove = (event: PointerEvent) => {
      const delta = terminalResizeStartRef.current.startY - event.clientY;
      setTerminalHeight(Math.max(120, Math.min(440, terminalResizeStartRef.current.height + delta)));
    };
    const handleUp = () => setIsResizingTerminal(false);
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
  }, [isResizingTerminal]);

  useEffect(() => {
    if (!moreToolsOpen) return;
    const closeOnPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !moreToolsRef.current?.contains(event.target)) {
        setMoreToolsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreToolsOpen(false);
    };
    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [moreToolsOpen]);

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

  const saveSelectedFile = useCallback(async () => {
    if (!selectedFile || !conversationId || !editorDirty || isSavingFile) return;
    setIsSavingFile(true);
    setFileSaveError("");
    setFileSaveNotice("");

    try {
      if (new TextEncoder().encode(editorDraft).byteLength > 1_000_000) {
        throw new Error("Le fichier dépasse la limite de 1 Mo. Scinde-le en plusieurs fichiers avant de l’enregistrer.");
      }
      let savedContent = editorDraft;
      let savedFile: MissionWorkspaceFile = {
        ...selectedFile,
        content: editorDraft,
        status: "saved",
      };

      if (latestMission?.id) {
        const missionFilesResponse = await fetch(
          `/api/idealy/missions/${encodeURIComponent(latestMission.id)}/files`,
          { cache: "no-store", credentials: "same-origin" },
        );
        const missionFilesPayload = (await missionFilesResponse.json().catch(() => ({}))) as {
          error?: string;
          files?: MissionWorkspaceFile[];
        };
        if (!missionFilesResponse.ok || !Array.isArray(missionFilesPayload.files)) {
          throw new Error(
            missionFilesPayload.error ??
              "Impossible de relire la dernière version du workspace avant l’enregistrement.",
          );
        }
        const persistedFile = missionFilesPayload.files.find(
          (file) => file.path === selectedFile.path,
        );
        if (!persistedFile || !Number.isSafeInteger(persistedFile.version)) {
          throw new Error(
            "La version enregistrée de ce fichier est introuvable. Rechargez le workspace avant de réessayer.",
          );
        }

        const response = await fetch(
          `/api/idealy/missions/${encodeURIComponent(latestMission.id)}/files/edit`,
          {
            body: JSON.stringify({
              content: editorDraft,
              expectedVersion: persistedFile.version,
              path: selectedFile.path,
            }),
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            method: "PATCH",
          },
        );
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
          file?: MissionWorkspaceFile;
        };
        if (!response.ok || !payload.file) {
          throw new Error(
            payload.error ??
              "Le backend n’a pas confirmé l’enregistrement de ce fichier.",
          );
        }
        savedFile = payload.file;
        savedContent = payload.file.content;
      }

      updateArtifactContent(conversationId, selectedFile.path, savedContent);
      setEditorDraft(savedContent);

      if (runtimeRef.current?.getActiveSession()) {
        if (selectedFile.path.replaceAll("\\", "/") === "package.json") {
          stopPreview();
          setFileSaveNotice("Fichier enregistré. Relancez l’aperçu pour appliquer les dépendances.");
          return;
        }
        try {
          const updated = await runtimeRef.current.writeFile(
            savedFile.path,
            savedContent,
          );
          setFileSaveNotice(
            updated
              ? "Fichier enregistré et prévisualisation actualisée."
              : "Fichier enregistré. Relancez l’aperçu pour charger la dernière version.",
          );
        } catch {
          setFileSaveNotice(
            "Fichier enregistré. Rechargez l’aperçu pour appliquer la dernière version.",
          );
        }
      } else {
        setFileSaveNotice(
          latestMission?.id
            ? "Fichier enregistré dans l’espace de mission."
            : "Fichier enregistré dans les livrables locaux de cette conversation.",
        );
      }
    } catch (cause) {
      setFileSaveError(
        cause instanceof Error
          ? cause.message
          : "Impossible d’enregistrer ce fichier.",
      );
    } finally {
      setIsSavingFile(false);
    }
  }, [
    conversationId,
    editorDirty,
    editorDraft,
    isSavingFile,
    latestMission?.id,
    selectedFile,
    stopPreview,
    updateArtifactContent,
  ]);

  useEffect(() => {
    const handleSaveShortcut = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "s" &&
        tab === "files"
      ) {
        event.preventDefault();
        void saveSelectedFile();
      }
    };
    window.addEventListener("keydown", handleSaveShortcut);
    return () => window.removeEventListener("keydown", handleSaveShortcut);
  }, [saveSelectedFile, tab]);

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

  const sharePreview = useCallback(async () => {
    if (!activePreviewUrl) return;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: activeConversation?.title || "Idealy preview",
          url: activePreviewUrl,
        });
        setShareStatus("Lien partagé");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(activePreviewUrl);
        setShareStatus("Lien de prévisualisation copié");
      } else {
        window.open(activePreviewUrl, "_blank", "noopener,noreferrer");
        setShareStatus("Aperçu ouvert dans un nouvel onglet");
      }
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") return;
      setShareStatus("Le partage de cette prévisualisation n’a pas abouti.");
    }
  }, [activeConversation?.title, activePreviewUrl]);

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
    : "relative hidden h-full min-h-0 w-[clamp(600px,60vw,1200px)] shrink-0 flex-col border-l border-border-subtle bg-bg-base xl:flex";

  const panelStyle: React.CSSProperties | undefined =
    !isExpanded && !isMobileOpen && workspaceWidth !== null
      ? { width: `${workspaceWidth}px` }
      : undefined;

  const renderFileTree = (nodes: WorkspaceFileTreeNode[], depth = 0): React.ReactNode =>
    nodes.map((node) => {
      if (node.kind === "folder") {
        const isOpen = openFolders.has(node.path);
        const FolderIcon = isOpen ? FolderOpen : Folder;
        return (
          <div key={node.path}>
            <button
              aria-expanded={isOpen}
              className="flex min-h-8 w-full items-center gap-1.5 rounded-md pr-2 text-left text-[10px] text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-main focus-ring"
              onClick={() => setOpenFolders((current) => {
                const next = new Set(current);
                if (next.has(node.path)) next.delete(node.path);
                else next.add(node.path);
                return next;
              })}
              style={{ paddingLeft: 8 + depth * 13 }}
              type="button"
            >
              <ChevronRight className={`h-3 w-3 shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
              <FolderIcon className="h-3.5 w-3.5 shrink-0 text-text-muted" />
              <span className="truncate">{node.name}</span>
            </button>
            {isOpen && <div>{renderFileTree(node.children, depth + 1)}</div>}
          </div>
        );
      }
      return (
        <button
          aria-current={selectedFilePath === node.path ? "page" : undefined}
          className={`flex min-h-8 w-full items-center gap-2 rounded-md pr-2 text-left text-[10px] transition-colors focus-ring ${selectedFilePath === node.path ? "bg-brand-primary/10 text-text-main" : "text-text-muted hover:bg-bg-subtle hover:text-text-main"}`}
          key={node.path}
          onClick={() => setSelectedFilePath(node.path)}
          style={{ paddingLeft: 26 + depth * 13 }}
          title={node.path}
          type="button"
        >
          <FileCode2 className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{node.name}</span>
          <span className="shrink-0 text-[9px] text-text-muted">{node.file.language || node.name.split(".").pop()}</span>
        </button>
      );
    });

  const resizeWorkspace = (direction: -1 | 1) => {
    const current = workspaceWidth ?? Math.min(1280, Math.max(640, Math.round(window.innerWidth * 0.62)));
    const maximum = Math.min(1560, Math.round(window.innerWidth * 0.86));
    setWorkspaceWidth(Math.max(600, Math.min(maximum, current + direction * 32)));
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
          aria-valuemax={1560}
          aria-valuemin={600}
          aria-valuenow={workspaceWidth ?? Math.min(1280, Math.max(640, Math.round(window.innerWidth * 0.62)))}
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
            aria-label="Share preview"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[10px] font-medium text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-main focus-ring disabled:cursor-not-allowed disabled:opacity-35"
            disabled={!activePreviewUrl}
            onClick={() => void sharePreview()}
            title={shareStatus || "Share the running preview"}
            type="button"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Share</span>
          </button>
          <button
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-primary px-2.5 text-[10px] font-semibold text-brand-onPrimary transition-opacity hover:opacity-90 focus-ring disabled:cursor-not-allowed disabled:opacity-35"
            disabled={!latestMission?.id}
            onClick={() => setIsPublishWorkspaceOpen(true)}
            title="Review GitHub and Vercel deployment options"
            type="button"
          >
            <CloudUpload className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Publish</span>
          </button>
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

      <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-border-subtle bg-bg-surface/75 px-3 sm:px-4">
        <nav aria-label="Vues principales du workspace" className="flex min-w-0 items-center gap-1">
          {([
            { id: "preview", label: "Preview", icon: Monitor },
            { id: "files", label: "Code", icon: Code2 },
            { id: "database", label: "Database", icon: Database },
          ] as const).map((item) => {
            const Icon = item.icon;
            return (
              <button
                aria-current={tab === item.id ? "page" : undefined}
                className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[12px] font-medium transition-colors focus-ring ${tab === item.id ? "bg-bg-base text-text-main shadow-subtle ring-1 ring-border-subtle" : "text-text-muted hover:bg-bg-subtle/70 hover:text-text-main"}`}
                key={item.id}
                onClick={() => selectTab(item.id)}
                type="button"
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="hidden text-[10px] tabular-nums text-text-muted sm:inline">
            {projectFiles.length ? projectFiles.length + " fichiers" : "Nouveau projet"}
          </span>
          <button
            aria-label={terminalOpen ? "Masquer le terminal" : "Afficher le terminal"}
            aria-pressed={terminalOpen}
            className={`grid h-8 w-8 place-items-center rounded-lg transition-colors focus-ring ${terminalOpen ? "bg-bg-base text-brand-primary shadow-subtle" : "text-text-muted hover:bg-bg-subtle hover:text-text-main"}`}
            onClick={() => {
              setTab("preview");
              setTerminalOpen((current) => !current);
            }}
            title="Terminal"
            type="button"
          >
            <TerminalSquare className="h-4 w-4" />
          </button>
          <div className="relative" ref={moreToolsRef}>
            <button
              aria-expanded={moreToolsOpen}
              aria-label="More workspace tools"
              className="grid h-8 w-8 place-items-center rounded-lg text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-main focus-ring"
              onClick={() => setMoreToolsOpen((current) => !current)}
              title="More options"
              type="button"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {moreToolsOpen && (
              <div className="absolute right-0 top-10 z-50 w-48 rounded-xl border border-border-subtle bg-bg-surface p-1.5 shadow-elevated">
                {([
                  { id: "console", label: "Console", icon: AlertCircle },
                  { id: "activity", label: "Activité", icon: FolderTree },
                  { id: "terminal-full", label: "Terminal complet", icon: TerminalSquare },
                ] as const).map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-xs text-text-main transition-colors hover:bg-bg-subtle focus-ring"
                      key={item.id}
                      onClick={() => {
                        setMoreToolsOpen(false);
                        if (item.id === "terminal-full") selectTab("terminal");
                        else selectTab(item.id);
                      }}
                      type="button"
                    >
                      <Icon className="h-3.5 w-3.5 text-text-muted" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {tab === "preview" && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-12 shrink-0 items-center gap-2 border-b border-border-subtle bg-bg-base px-3 sm:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
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

          <div className="flex min-h-10 shrink-0 items-center gap-2 border-b border-border-subtle bg-bg-surface/50 px-3">
            <Home className="h-3.5 w-3.5 shrink-0 text-text-muted" />
            <select
              aria-label="Page de l’application"
              className="h-8 max-w-[180px] rounded-lg border border-border-subtle bg-bg-base px-2 text-[11px] text-text-main outline-none focus:ring-1 focus:ring-brand-primary"
              onChange={(event) => setPreviewPath(event.target.value)}
              value={previewPath}
            >
              {routes.map((route) => (
                <option key={route.path} value={route.path}>{route.label}</option>
              ))}
            </select>
            <span className="hidden text-[10px] text-text-muted sm:inline">/</span>
            <input
              aria-label="Adresse de la page de prévisualisation"
              className="h-8 min-w-0 flex-1 rounded-lg border border-border-subtle bg-bg-base px-3 font-mono text-[11px] text-text-main outline-none placeholder:text-text-muted focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20"
              onChange={(event) => setPreviewPathDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  const nextPath = previewPathDraft.trim().startsWith("/")
                    ? previewPathDraft.trim()
                    : "/" + previewPathDraft.trim();
                  setPreviewPath(nextPath || "/");
                }
              }}
              onBlur={() => {
                const nextPath = previewPathDraft.trim().startsWith("/")
                  ? previewPathDraft.trim()
                  : "/" + previewPathDraft.trim();
                setPreviewPath(nextPath || "/");
              }}
              placeholder="/"
              value={previewPathDraft}
            />
            {runtimeUrl && (
              <span className="hidden max-w-40 truncate font-mono text-[10px] text-text-muted xl:inline">
                {runtimeUrl.replace(/^https?:\/\//, "")}
              </span>
            )}
          </div>

          <div className={`relative flex min-h-0 flex-1 items-center justify-center overflow-auto ${viewport === "desktop" ? "bg-bg-base p-0" : "bg-[radial-gradient(ellipse_at_center,var(--dsw-alias-bg-layer-2),var(--dsw-alias-bg-base)_75%)] p-3 sm:p-5"}`}>
            {hasPreview ? (
              <div
                className={`h-full min-h-0 shrink-0 overflow-hidden bg-white transition-[width] duration-300 ${viewport === "mobile" ? "rounded-[2rem] border-[8px] border-[#17191e] shadow-[0_14px_50px_-18px_rgba(0,0,0,0.35)]" : viewport === "tablet" ? "rounded-2xl border border-border-subtle shadow-[0_14px_50px_-18px_rgba(0,0,0,0.35)]" : "w-full border-0 rounded-none"}`}
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
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-bg-base px-6 text-center">
                {(generationActive || isBusy) ? (
                  <LoaderCircle className="h-6 w-6 animate-spin text-brand-primary" />
                ) : (
                  <div className="grid h-11 w-11 place-items-center rounded-xl border border-border-subtle bg-bg-surface text-text-muted">
                    <FileCode2 className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-semibold text-text-main">
                    {generationActive || isBusy ? "Préparation de la prévisualisation" : "Aucun aperçu disponible"}
                  </h3>
                  <p className="mt-1 max-w-md text-xs leading-5 text-text-muted">
                    {runtimeError || unsupportedReason || (hasManifest
                      ? "Le projet contient ses fichiers source. Lancez le runtime pour afficher l’application dans cet espace."
                      : htmlSource
                        ? "Le contenu HTML est disponible, mais aucun document autonome ne peut être affiché pour le moment."
                        : "Les fichiers et le rendu de l’application apparaîtront ici au fur et à mesure de la construction.")}
                  </p>
                </div>
                {hasManifest && !runtimeUrl && (
                  <button
                    className="mt-1 inline-flex h-9 items-center gap-2 rounded-lg bg-brand-primary px-3.5 text-xs font-semibold text-brand-onPrimary transition-opacity hover:opacity-90 focus-ring disabled:opacity-50"
                    disabled={isBusy}
                    onClick={() => void startPreview()}
                    type="button"
                  >
                    {isBusy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    Démarrer le runtime
                  </button>
                )}
                {runtimeError && (
                  <p className="mt-1 max-w-xl rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-left text-[11px] text-amber-500" role="alert">
                    {runtimeError}
                  </p>
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

          {terminalOpen && (
            <section
              aria-label="Terminal du projet"
              className="flex shrink-0 flex-col overflow-hidden border-t border-[#343841] bg-[#111318] text-zinc-100"
              style={{ height: terminalHeight }}
            >
              <div
                aria-label="Redimensionner le terminal"
                aria-orientation="horizontal"
                aria-valuemax={440}
                aria-valuemin={120}
                aria-valuenow={terminalHeight}
                className="group flex h-1 shrink-0 cursor-row-resize justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                onKeyDown={(event) => {
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setTerminalHeight((height) => Math.min(440, height + 16));
                  } else if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setTerminalHeight((height) => Math.max(120, height - 16));
                  }
                }}
                onPointerDown={(event) => {
                  terminalResizeStartRef.current = { startY: event.clientY, height: terminalHeight };
                  setIsResizingTerminal(true);
                }}
                role="separator"
                tabIndex={0}
              >
                <span className="h-0.5 w-12 rounded-full bg-white/20 transition-colors group-hover:bg-brand-primary/70" />
              </div>
              <div className="flex h-9 shrink-0 items-center gap-2 border-b border-white/[0.08] px-3 text-[11px] text-white/80">
                <TerminalSquare className="h-3.5 w-3.5" />
                <span className="font-medium">Terminal</span>
                <span className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[9px] text-white/55">~/project</span>
                <span className="ml-auto text-[10px] text-white/45">{isBusy ? statusText : runtimeState === "ready" ? "Serveur actif" : runtimeState === "error" ? "Erreur" : "En attente"}</span>
                <button
                  aria-label="Effacer la sortie du terminal"
                  className="grid h-6 w-6 place-items-center rounded text-white/55 hover:bg-white/10 hover:text-white focus-ring"
                  onClick={() => setRuntimeOutput("")}
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
                <button
                  aria-label="Masquer le terminal"
                  className="grid h-6 w-6 place-items-center rounded text-white/55 hover:bg-white/10 hover:text-white focus-ring"
                  onClick={() => setTerminalOpen(false)}
                  type="button"
                >
                  <Minimize2 className="h-3 w-3" />
                </button>
              </div>
              <pre aria-live="polite" className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words px-3 py-2 font-mono text-[10px] leading-4 text-white/75">
                {runtimeOutput || runtimeError || (isBusy ? "Préparation du runtime…" : "Le terminal affichera ici les commandes et sorties réelles du runtime.")}
              </pre>
            </section>
          )}

          <footer className="flex min-h-9 shrink-0 items-center justify-between gap-3 border-t border-border-subtle px-3 text-[10px] text-text-muted">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate">{runtimeUrl ? "WebContainer · Node.js dans le navigateur" : isStaticPreview ? "Aperçu HTML isolé" : "Workspace prêt"}</span>
              {unsupportedReason && <span className="truncate text-amber-500">{unsupportedReason}</span>}
            </div>
            <button
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-medium text-text-muted hover:bg-bg-subtle hover:text-text-main focus-ring disabled:opacity-40"
              disabled={!hasManifest || isSavingFile}
              onClick={() => {
                if (isBusy || runtimeUrl) stopPreview();
                else void startPreview();
              }}
              type="button"
            >
              {isBusy || runtimeUrl ? <Square className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3" />}
              {isBusy ? "Arrêter" : runtimeUrl ? "Arrêter" : runtimeState === "stopped" ? "Relancer" : "Lancer"}
            </button>
          </footer>
        </div>
      )}

      {tab === "files" && (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(210px,270px)_minmax(0,1fr)] bg-bg-base">
          <nav aria-label="Files explorer" className="flex min-h-0 flex-col overflow-hidden border-r border-border-subtle bg-bg-surface/55">
            <div className="flex h-10 shrink-0 items-center justify-between border-b border-border-subtle px-3">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                <FolderTree className="h-3.5 w-3.5" />
                Explorer
              </div>
              <span className="text-[10px] tabular-nums text-text-muted">{projectFiles.length}</span>
            </div>
            <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border-subtle px-2">
              <button
                aria-pressed={explorerMode === "files"}
                className={`flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-medium focus-ring ${explorerMode === "files" ? "bg-bg-base text-text-main" : "text-text-muted hover:bg-bg-subtle"}`}
                onClick={() => setExplorerMode("files")}
                type="button"
              >
                <Folder className="h-3 w-3" /> Files
              </button>
              <button
                aria-pressed={explorerMode === "search"}
                className={`flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-medium focus-ring ${explorerMode === "search" ? "bg-bg-base text-text-main" : "text-text-muted hover:bg-bg-subtle"}`}
                onClick={() => setExplorerMode("search")}
                type="button"
              >
                <Search className="h-3 w-3" /> Search
              </button>
            </div>
            {explorerMode === "search" && (
              <div className="shrink-0 border-b border-border-subtle p-2">
                <div className="flex h-8 items-center gap-2 rounded-md border border-border-subtle bg-bg-base px-2">
                  <Search className="h-3 w-3 shrink-0 text-text-muted" />
                  <input
                    aria-label="Search in files"
                    className="min-w-0 flex-1 bg-transparent text-[10px] text-text-main outline-none placeholder:text-text-muted"
                    onChange={(event) => setFileSearch(event.target.value)}
                    placeholder="Search in files"
                    value={fileSearch}
                  />
                  {fileSearch && (
                    <button aria-label="Clear file search" className="text-text-muted hover:text-text-main" onClick={() => setFileSearch("")} type="button">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto py-2">
              {explorerMode === "search" ? (
                searchableFiles.length ? searchableFiles.map((file) => (
                  <button
                    aria-current={selectedFilePath === file.path ? "page" : undefined}
                    className={`flex min-h-8 w-full items-center gap-2 px-3 text-left text-[10px] focus-ring ${selectedFilePath === file.path ? "bg-brand-primary/10 text-text-main" : "text-text-muted hover:bg-bg-subtle hover:text-text-main"}`}
                    key={file.path}
                    onClick={() => setSelectedFilePath(file.path)}
                    type="button"
                  >
                    <FileCode2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{file.path}</span>
                  </button>
                )) : (
                  <p className="px-3 py-5 text-center text-[10px] text-text-muted">{fileSearch ? "No matching files." : "Type to search file names and content."}</p>
                )
              ) : projectFiles.length ? (
                renderFileTree(fileTree)
              ) : (
                <p className="px-3 py-5 text-center text-[10px] text-text-muted">Les fichiers apparaîtront ici pendant la construction.</p>
              )}
            </div>
          </nav>
          <section className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#0e1117] text-zinc-200">
            {selectedFile ? (
              <>
                <header className="flex min-h-11 shrink-0 items-center justify-between gap-2 border-b border-white/[0.08] bg-[#151922] px-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                      <span>app</span><ChevronRight className="h-3 w-3" />
                      <span className="truncate font-mono text-zinc-200">{selectedFile.path}</span>
                    </div>
                    <p className="mt-0.5 text-[9px] text-zinc-500">
                      {selectedFile.language ?? selectedFile.path.split(".").pop() ?? "text"}
                      {" · "}{editorDraft.length.toLocaleString("fr-FR")} caractères
                      {editorDirty ? " · Modifications non enregistrées" : " · Enregistré"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      aria-label="Copy selected file"
                      className="grid h-7 w-7 place-items-center rounded-md text-[10px] text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-white focus-ring"
                      onClick={() => {
                        void navigator.clipboard?.writeText(editorDraft).then(() => setFileSaveNotice("Contenu copié."));
                      }}
                      type="button"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="inline-flex h-7 items-center rounded-md px-2 text-[10px] text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-white focus-ring disabled:opacity-40"
                      disabled={!editorDirty || isSavingFile}
                      onClick={() => setEditorDraft(selectedFile.content)}
                      type="button"
                    >
                      Annuler
                    </button>
                    <button
                      className="inline-flex h-7 items-center gap-1.5 rounded-md bg-brand-primary px-2.5 text-[10px] font-semibold text-brand-onPrimary transition-opacity hover:opacity-90 focus-ring disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={!editorDirty || isSavingFile}
                      onClick={() => void saveSelectedFile()}
                      type="button"
                    >
                      {isSavingFile ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      Enregistrer
                    </button>
                  </div>
                </header>
                <div className="flex min-h-0 flex-1 overflow-hidden">
                  <div aria-hidden="true" className="hidden shrink-0 select-none overflow-hidden border-r border-white/[0.06] px-2 py-3 text-right font-mono text-[10px] leading-5 text-zinc-600 sm:block" ref={lineNumbersRef}>
                    {editorDraft.split("\n").map((_, index) => (
                      <div key={index}>{index + 1}</div>
                    ))}
                  </div>
                  <textarea
                    aria-label={`Éditer ${selectedFile.path}`}
                    className="min-h-0 min-w-0 flex-1 resize-none overflow-auto bg-transparent px-3 py-3 font-mono text-[11px] leading-5 text-zinc-200 outline-none placeholder:text-zinc-600 focus:ring-0"
                    onChange={(event) => {
                      setEditorDraft(event.target.value);
                      setFileSaveNotice("");
                      setFileSaveError("");
                    }}
                    onScroll={(event) => {
                      if (lineNumbersRef.current) {
                        lineNumbersRef.current.scrollTop = event.currentTarget.scrollTop;
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Tab") {
                        event.preventDefault();
                        const target = event.currentTarget;
                        const start = target.selectionStart;
                        const end = target.selectionEnd;
                        const next = `${editorDraft.slice(0, start)}  ${editorDraft.slice(end)}`;
                        setEditorDraft(next);
                        requestAnimationFrame(() => {
                          target.selectionStart = start + 2;
                          target.selectionEnd = start + 2;
                        });
                      }
                    }}
                    spellCheck={false}
                    value={editorDraft}
                    wrap="off"
                  />
                </div>
                <footer className="flex min-h-8 shrink-0 flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] px-3 py-1.5 text-[9px]">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 text-zinc-500">{selectedFile.language ?? selectedFile.path.split(".").pop() ?? "text"}</span>
                    {fileSaveNotice && <span className="truncate text-emerald-400">{fileSaveNotice}</span>}
                    {fileSaveError && <span className="truncate text-rose-400">{fileSaveError}</span>}
                  </div>
                  <span className="shrink-0 text-zinc-600">Ctrl/⌘ + S pour enregistrer</span>
                </footer>
              </>
            ) : (
              <div className="grid h-full place-items-center px-5 text-center text-xs text-zinc-500">
                Aucun fichier source disponible pour cette conversation.
              </div>
            )}
          </section>
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

      {tab === "database" && (
        <section className="min-h-0 flex-1 overflow-y-auto bg-bg-base p-4 sm:p-5">
          <div className="mx-auto max-w-5xl space-y-4">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-text-main">Database</h3>
                <p className="mt-1 text-[11px] text-text-muted">Read-only snapshot from this mission’s persisted records.</p>
              </div>
              <button
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border-subtle px-2.5 text-[10px] font-medium text-text-muted hover:bg-bg-subtle hover:text-text-main focus-ring"
                disabled={!latestMission?.id || databaseLoading}
                onClick={() => {
                  if (!latestMission?.id) return;
                  databaseLoadKeyRef.current = null;
                  setDatabaseSnapshot(null);
                  setDatabaseError("");
                }}
                type="button"
              >
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
            </header>
            {!latestMission?.id ? (
              <div className="rounded-xl border border-border-subtle bg-bg-surface p-6 text-center text-xs text-text-muted">
                No persisted mission is attached to this conversation.
              </div>
            ) : databaseLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-border-subtle bg-bg-surface p-8 text-xs text-text-muted">
                <LoaderCircle className="h-4 w-4 animate-spin" /> Reading mission records…
              </div>
            ) : databaseError ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-500" role="alert">
                {databaseError}
              </div>
            ) : databaseSnapshot?.missionId === latestMission.id ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-xl border border-border-subtle bg-bg-surface p-4">
                    <p className="text-[10px] uppercase tracking-wide text-text-muted">Mission</p>
                    <p className="mt-2 truncate text-sm font-semibold text-text-main">{databaseSnapshot.data.mission?.title || latestMission.plan.projectKind}</p>
                    <p className="mt-1 font-mono text-[10px] text-text-muted">{databaseSnapshot.data.mission?.id || latestMission.id}</p>
                  </div>
                  <div className="rounded-xl border border-border-subtle bg-bg-surface p-4">
                    <p className="text-[10px] uppercase tracking-wide text-text-muted">Agent runs</p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-text-main">{databaseSnapshot.data.agentRuns.length}</p>
                    {databaseSnapshot.data.errors.agentRuns && <p className="mt-1 text-[10px] text-amber-500">Unavailable</p>}
                  </div>
                  <div className="rounded-xl border border-border-subtle bg-bg-surface p-4">
                    <p className="text-[10px] uppercase tracking-wide text-text-muted">File events</p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-text-main">{databaseSnapshot.data.events.length}</p>
                    {databaseSnapshot.data.errors.events && <p className="mt-1 text-[10px] text-amber-500">Unavailable</p>}
                  </div>
                </div>
                <section className="overflow-hidden rounded-xl border border-border-subtle bg-bg-surface">
                  <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
                    <h4 className="text-xs font-semibold text-text-main">Agent runs</h4>
                    <span className="text-[10px] text-text-muted">Persisted records</span>
                  </div>
                  {databaseSnapshot.data.agentRuns.length ? (
                    <div className="divide-y divide-border-subtle">
                      {databaseSnapshot.data.agentRuns.map((run) => (
                        <div className="flex flex-wrap items-center gap-3 px-4 py-3" key={run.id}>
                          <span className="min-w-0 flex-1 truncate text-xs font-medium text-text-main">{run.agent_key}</span>
                          <span className="rounded-md bg-bg-subtle px-2 py-1 text-[10px] text-text-muted">{run.status}</span>
                          <span className="text-[10px] tabular-nums text-text-muted">Step {run.step_index + 1}</span>
                          <span className="text-[10px] text-text-muted">{run.completed_at ? new Date(run.completed_at).toLocaleString() : run.started_at ? new Date(run.started_at).toLocaleString() : "—"}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="px-4 py-6 text-center text-xs text-text-muted">No persisted agent runs.</p>
                  )}
                </section>
                <section className="overflow-hidden rounded-xl border border-border-subtle bg-bg-surface">
                  <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
                    <h4 className="text-xs font-semibold text-text-main">File events</h4>
                    <span className="text-[10px] text-text-muted">Sequence log</span>
                  </div>
                  {databaseSnapshot.data.events.length ? (
                    <div className="divide-y divide-border-subtle">
                      {databaseSnapshot.data.events.slice(0, 100).map((entry) => (
                        <div className="flex flex-wrap items-center gap-3 px-4 py-2.5" key={entry.id}>
                          <span className="w-12 shrink-0 font-mono text-[10px] text-text-muted">#{entry.sequence}</span>
                          <span className="min-w-0 flex-1 truncate text-xs text-text-main">{entry.event_type}</span>
                          {entry.path && <span className="max-w-[45%] truncate font-mono text-[10px] text-text-muted">{entry.path}</span>}
                          <span className="text-[10px] text-text-muted">{new Date(entry.created_at).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="px-4 py-6 text-center text-xs text-text-muted">No persisted file events.</p>
                  )}
                </section>
              </>
            ) : (
              <div className="rounded-xl border border-border-subtle bg-bg-surface p-8 text-center text-xs text-text-muted">
                Data has not been loaded yet.
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

      {isPublishWorkspaceOpen && latestMission?.id && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 text-xs text-white">
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Ouverture des options de publication…
            </div>
          }
        >
          <MissionWorkspaceModal
            buildVerification={latestMission.buildVerification}
            initialFiles={projectFiles}
            missionId={latestMission.id}
            onClose={() => setIsPublishWorkspaceOpen(false)}
            projectName={latestMission.plan.projectKind || activeConversation?.title || "Idealy project"}
          />
        </Suspense>
      )}
    </aside>
  );
};
