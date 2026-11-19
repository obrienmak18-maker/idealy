import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import { getConversationWorkspaceFiles } from "../../services/conversationWorkspace";
import { compileWorkspacePreview } from "../../services/previewCompiler";
import type { ProjectRuntimeState } from "../../services/projectRuntime";
import type { MissionWorkspaceFile } from "../../types";
import { Composer } from "../chat/Composer";
import { MessageList } from "../chat/MessageList";
import { Header } from "../layout/Header";
import { ClarifyingQuestionsCard } from "./clarifying-questions-card";
import { CodePane } from "./code-pane";
import { DatabasePane } from "./database-pane";
import { MorePane } from "./more-pane";
import { NotificationBanner } from "./notification-banner";
import { PreviewPane } from "./preview-pane";
import { StudioLayout, type StudioTab } from "./studio-layout";
import { StudioTopBar } from "./studio-top-bar";
import { VersionHistoryDrawer } from "./version-history-drawer";

type DeviceViewport = "desktop" | "tablet" | "mobile";

/**
 * StudioWorkspace is the top-level orchestrator for the two-pane studio layout.
 * It replaces the old Header + MessageList + Composer + SidecarPanel single-column
 * layout when the user has an active conversation with messages.
 *
 * Left pane: Chat (MessageList + Composer + NotificationBanner + ClarifyingQuestions)
 * Right pane: Tabbed workspace (Preview | Code | Database | More)
 */
export const StudioWorkspace: React.FC = () => {
  const { activeMessages, activeConversation, artifacts, generationStatus } = useApp();

  const [activeTab, setActiveTab] = useState<StudioTab>("preview");
  const [device, setDevice] = useState<DeviceViewport>("desktop");
  const [historyOpen, setHistoryOpen] = useState(false);

  // Runtime state for preview
  const [runtimeState, setRuntimeState] =
    useState<ProjectRuntimeState>("stopped");
  const [runtimeUrl, setRuntimeUrl] = useState("");
  const [runtimeError, setRuntimeError] = useState("");
  const [runtimeOutput, setRuntimeOutput] = useState("");
  const runtimeModuleRef = useRef<
    typeof import("../../services/projectRuntime") | null
  >(null);
  const previewGenerationRef = useRef(0);

  // Full conversation workspace files from both mission snapshots and artifacts
  const workspaceFiles = useMemo<MissionWorkspaceFile[]>(() => {
    return getConversationWorkspaceFiles(
      activeMessages,
      artifacts,
      activeConversation?.id
    );
  }, [activeMessages, artifacts, activeConversation?.id]);

  // Compiled preview result (works instantly, even while WebContainer dev server boots)
  const compiledResult = useMemo(() => {
    return compileWorkspacePreview({
      files: workspaceFiles,
      isStreaming: generationStatus === "receiving",
      projectTitle: activeConversation?.title || "Idealy Project",
    });
  }, [workspaceFiles, generationStatus, activeConversation?.title]);

  const missionId = useMemo<string | null>(() => {
    for (let i = activeMessages.length - 1; i >= 0; i--) {
      const msg = activeMessages[i];
      if (msg.mission?.id) {
        return msg.mission.id;
      }
    }
    return null;
  }, [activeMessages]);

  const hasProjectManifest = workspaceFiles.some(
    (f) => f.path.replace(/\\/g, "/").replace(/^\/+/, "") === "package.json"
  );

  const startPreview = useCallback(async () => {
    if (!hasProjectManifest) {
      return;
    }
    setRuntimeError("");
    setRuntimeOutput("");
    setRuntimeUrl("");
    setRuntimeState("booting");
    const generation = ++previewGenerationRef.current;
    try {
      const runtime = await import("../../services/projectRuntime");
      runtimeModuleRef.current = runtime;
      if (generation !== previewGenerationRef.current) {
        runtime.stopProjectPreview();
        return;
      }
      const url = await runtime.startProjectPreview(workspaceFiles, {
        onOutput: (text) => setRuntimeOutput((c) => (c + text).slice(-18_000)),
        onState: setRuntimeState,
      });
      setRuntimeUrl(url);
    } catch (cause) {
      setRuntimeState("error");
      setRuntimeError(
        cause instanceof Error ? cause.message : "Preview could not start."
      );
    }
  }, [hasProjectManifest, workspaceFiles]);

  // Auto-start preview when project manifest arrives and dev server is idle
  useEffect(() => {
    if (
      hasProjectManifest &&
      runtimeState === "stopped" &&
      !runtimeUrl &&
      workspaceFiles.length > 0
    ) {
      startPreview();
    }
  }, [hasProjectManifest, runtimeState, runtimeUrl, workspaceFiles.length, startPreview]);

  const stopPreview = useCallback(() => {
    previewGenerationRef.current += 1;
    runtimeModuleRef.current?.stopProjectPreview();
    setRuntimeUrl("");
    setRuntimeState("stopped");
  }, []);

  const refreshPreview = useCallback(() => {
    window.dispatchEvent(new Event("idealy:refresh-preview"));
  }, []);

  const openExternal = useCallback(() => {
    if (runtimeUrl) {
      window.open(runtimeUrl, "_blank");
    } else if (compiledResult.html) {
      const blob = new Blob([compiledResult.html], { type: "text/html" });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    }
  }, [runtimeUrl, compiledResult.html]);

  const downloadProject = useCallback(async () => {
    if (workspaceFiles.length === 0) {
      return;
    }
    const { downloadZip } = await import("../../utils/zip");
    downloadZip(
      workspaceFiles.map((f) => ({ content: f.content, path: f.path })),
      `${activeConversation?.title || "idealy-project"}.zip`
    );
  }, [workspaceFiles, activeConversation]);

  // Decide whether to show the two-pane layout or single-column
  const hasStudioContent = activeMessages.length > 0;

  // When no messages yet, show the single-column home view
  if (!hasStudioContent) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <Header />
        <main
          className="flex-1 flex flex-col overflow-hidden relative"
          id="main-content"
        >
          <MessageList />
        </main>
      </div>
    );
  }

  // Two-pane studio layout
  const leftPane = (
    <div className="flex h-full flex-col overflow-hidden">
      <Header />
      <main
        className="flex-1 flex flex-col overflow-hidden relative"
        id="main-content"
      >
        <MessageList />
        <ClarifyingQuestionsCard />
        <NotificationBanner />
        <Composer />
      </main>
    </div>
  );

  const rightPane = (() => {
    switch (activeTab) {
      case "preview":
        return (
          <PreviewPane
            compiledHtml={compiledResult.html}
            device={device}
            hasProjectManifest={hasProjectManifest}
            onStartPreview={startPreview}
            onStopPreview={stopPreview}
            previewUrl={runtimeUrl}
            runtimeError={runtimeError}
            runtimeOutput={runtimeOutput}
            runtimeState={runtimeState}
          />
        );
      case "code":
        return (
          <CodePane
            files={workspaceFiles}
            onDownloadProject={
              workspaceFiles.length > 0 ? downloadProject : undefined
            }
            terminalOutput={runtimeOutput}
          />
        );
      case "database":
        return <DatabasePane missionId={missionId} />;
      case "more":
        return <MorePane />;
      default:
        return null;
    }
  })();

  const topBar = (
    <StudioTopBar
      activeTab={activeTab}
      device={device}
      onDeviceChange={setDevice}
      onOpenExternal={openExternal}
      onRefresh={refreshPreview}
      onTabChange={setActiveTab}
      onToggleHistory={() => setHistoryOpen(true)}
    />
  );

  return (
    <>
      <StudioLayout
        leftPane={leftPane}
        rightPane={rightPane}
        rightPaneHidden={false}
        topBar={topBar}
      />
      <VersionHistoryDrawer
        isOpen={historyOpen}
        missionId={missionId ?? ""}
        onClose={() => setHistoryOpen(false)}
      />
    </>
  );
};
