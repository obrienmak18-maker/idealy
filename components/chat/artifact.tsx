import type { UseChatHelpers } from "@ai-sdk/react";
import equal from "fast-deep-equal";
import { AnimatePresence, motion } from "framer-motion";
import {
  Database as DatabaseIcon,
  FileCode2,
  FileJson,
  Folder,
  TerminalSquare,
} from "lucide-react";
import {
  type Dispatch,
  memo,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import useSWR, { useSWRConfig } from "swr";
import { useWindowSize } from "usehooks-ts";
import { codeArtifact } from "@/artifacts/code/client";
import { imageArtifact } from "@/artifacts/image/client";
import { sheetArtifact } from "@/artifacts/sheet/client";
import { textArtifact } from "@/artifacts/text/client";
import { useArtifact } from "@/hooks/use-artifact";
import { IdealyMark } from "@/components/branding/idealy-logo";
import type { Document, Vote } from "@/lib/db/schema";
import type { Attachment, ChatMessage } from "@/lib/types";
import { fetcher } from "@/lib/utils";
import { VersionFooter } from "./version-footer";
import type { VisibilityType } from "./visibility-selector";

export const artifactDefinitions = [
  textArtifact,
  codeArtifact,
  imageArtifact,
  sheetArtifact,
];
export type ArtifactKind = (typeof artifactDefinitions)[number]["kind"];

export type UIArtifact = {
  title: string;
  documentId: string;
  kind: ArtifactKind;
  content: string;
  preview?: string;
  isVisible: boolean;
  status: "streaming" | "idle";
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
};

function PureArtifact({
  addToolApprovalResponse: _addToolApprovalResponse,
  chatId: _chatId,
  input: _input,
  setInput: _setInput,
  status,
  stop,
  attachments: _attachments,
  setAttachments: _setAttachments,
  sendMessage,
  messages: _messages,
  setMessages,
  regenerate: _regenerate,
  votes: _votes,
  isReadonly: _isReadonly,
  selectedVisibilityType: _selectedVisibilityType,
  selectedModelId: _selectedModelId,
}: {
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
  chatId: string;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  status: UseChatHelpers<ChatMessage>["status"];
  stop: UseChatHelpers<ChatMessage>["stop"];
  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  messages: ChatMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  votes: Vote[] | undefined;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  isReadonly: boolean;
  selectedVisibilityType: VisibilityType;
  selectedModelId: string;
}) {
  const { artifact, setArtifact, metadata, setMetadata } = useArtifact();

  const {
    data: documents,
    isLoading: isDocumentsFetching,
    mutate: mutateDocuments,
  } = useSWR<Document[]>(
    artifact.documentId !== "init" && artifact.status !== "streaming"
      ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/document?id=${artifact.documentId}`
      : null,
    fetcher
  );

  const [mode, setMode] = useState<"edit" | "diff">("edit");
  const [activeView, setActiveView] = useState<
    "preview" | "code" | "console" | "database"
  >("preview");
  const [consoleTab, setConsoleTab] = useState<"console" | "network" | "build">(
    "console"
  );
  const [previewPath, setPreviewPath] = useState("/");
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">(
    "desktop"
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [document, setDocument] = useState<Document | null>(null);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(-1);

  useEffect(() => {
    window.document.documentElement.toggleAttribute("data-idealy-canvas-expanded", isExpanded);
    return () => {
      window.document.documentElement.removeAttribute("data-idealy-canvas-expanded");
    };
  }, [isExpanded]);

  const artifactContentRef = useRef<HTMLDivElement>(null);
  const previewHtmlForFrameRef = useRef("");
  const userScrolledArtifact = useRef(false);
  const [isContentDirty, setIsContentDirty] = useState(false);
  const openPreviewWindowForEvents = useCallback(() => {
    const previewWindow = window.open(
      "",
      "idealy-preview",
      "popup,width=1280,height=820"
    );
    if (!previewWindow) {
      return;
    }
    previewWindow.document.write(
      previewHtmlForFrameRef.current || artifact.preview || ""
    );
    previewWindow.document.close();
  }, [artifact.preview]);

  useEffect(() => {
    const handleView = (event: Event) => {
      const nextView = (
        event as CustomEvent<"preview" | "code" | "data" | "database">
      ).detail;
      setActiveView(nextView === "data" ? "database" : nextView);
    };
    const handleDevice = (event: Event) =>
      setViewport(
        (event as CustomEvent<"desktop" | "tablet" | "mobile">).detail
      );
    const handleRefresh = () => setPreviewKey((key) => key + 1);
    const handlePreviewPage = (event: Event) => {
      const nextPath = (event as CustomEvent<string>).detail;
      setPreviewPath(nextPath?.startsWith("/") ? nextPath : "/");
    };
    const handleShowConsole = () => {
      setConsoleTab("console");
      setActiveView("console");
    };
    const handleToggleFullscreen = () => setIsExpanded((value) => !value);
    const handleOpenPreview = () => openPreviewWindowForEvents();
    window.addEventListener("idealy:set-view", handleView);
    window.addEventListener("idealy:set-device", handleDevice);
    window.addEventListener("idealy:refresh-preview", handleRefresh);
    window.addEventListener("idealy:set-preview-page", handlePreviewPage);
    window.addEventListener("idealy:show-console", handleShowConsole);
    window.addEventListener("idealy:toggle-fullscreen", handleToggleFullscreen);
    window.addEventListener("idealy:open-preview", handleOpenPreview);
    return () => {
      window.removeEventListener("idealy:set-view", handleView);
      window.removeEventListener("idealy:set-device", handleDevice);
      window.removeEventListener("idealy:refresh-preview", handleRefresh);
      window.removeEventListener("idealy:set-preview-page", handlePreviewPage);
      window.removeEventListener("idealy:show-console", handleShowConsole);
      window.removeEventListener("idealy:toggle-fullscreen", handleToggleFullscreen);
      window.removeEventListener("idealy:open-preview", handleOpenPreview);
    };
  }, [openPreviewWindowForEvents]);

  useEffect(() => {
    if (artifact.status !== "streaming") {
      userScrolledArtifact.current = false;
      return;
    }
    if (userScrolledArtifact.current) {
      return;
    }
    const el = artifactContentRef.current;
    if (!el) {
      return;
    }
    el.scrollTo({ top: el.scrollHeight });
  }, [artifact.status]);

  useEffect(() => {
    if (documents && documents.length > 0) {
      const mostRecentDocument = documents.at(-1);

      if (mostRecentDocument) {
        setDocument(mostRecentDocument);
        setCurrentVersionIndex(documents.length - 1);
        if (artifact.status === "streaming" || !isContentDirty) {
          setArtifact((currentArtifact) => ({
            ...currentArtifact,
            content: mostRecentDocument.content ?? "",
          }));
        }
      }
    }
  }, [documents, setArtifact, artifact.status, isContentDirty]);

  useEffect(() => {
    mutateDocuments();
  }, [mutateDocuments]);

  const { mutate } = useSWRConfig();

  const handleContentChange = useCallback(
    (updatedContent: string) => {
      if (!artifact) {
        return;
      }

      mutate<Document[]>(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/document?id=${artifact.documentId}`,
        async (currentDocuments) => {
          if (!currentDocuments) {
            return [];
          }

          const currentDocument = currentDocuments.at(-1);

          if (!currentDocument?.content) {
            setIsContentDirty(false);
            return currentDocuments;
          }

          if (currentDocument.content === updatedContent) {
            setIsContentDirty(false);
            return currentDocuments;
          }

          await fetch(
            `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/document?id=${artifact.documentId}`,
            {
              body: JSON.stringify({
                content: updatedContent,
                isManualEdit: true,
                kind: artifact.kind,
                title: artifact.title,
              }),
              method: "POST",
            }
          );

          setIsContentDirty(false);

          return currentDocuments.map((doc, i) =>
            i === currentDocuments.length - 1
              ? { ...doc, content: updatedContent }
              : doc
          );
        },
        { revalidate: false }
      );
    },
    [artifact, mutate]
  );

  const latestContentRef = useRef<string>("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveContent = useCallback(
    (updatedContent: string, debounce: boolean) => {
      latestContentRef.current = updatedContent;
      setIsContentDirty(true);

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      if (debounce) {
        saveTimerRef.current = setTimeout(() => {
          handleContentChange(latestContentRef.current);
          saveTimerRef.current = null;
        }, 2000);
      } else {
        handleContentChange(updatedContent);
      }
    },
    [handleContentChange]
  );

  const getDocumentContentById = useCallback(
    (index: number) => {
      if (!documents) {
        return "";
      }
      if (!documents[index]) {
        return "";
      }
      return documents[index].content ?? "";
    },
    [documents]
  );

  const handleVersionChange = useCallback(
    (type: "next" | "prev" | "toggle" | "latest") => {
      if (!documents) {
        return;
      }

      if (type === "latest") {
        setCurrentVersionIndex(documents.length - 1);
        setMode("edit");
      }

      if (type === "toggle") {
        setMode((currentMode) => (currentMode === "edit" ? "diff" : "edit"));
      }

      if (type === "prev") {
        if (currentVersionIndex > 0) {
          setCurrentVersionIndex((index) => index - 1);
        }
      } else if (
        type === "next" &&
        currentVersionIndex < documents.length - 1
      ) {
        setCurrentVersionIndex((index) => index + 1);
      }
    },
    [currentVersionIndex, documents]
  );

  const handleArtifactScroll = useCallback(() => {
    const el = artifactContentRef.current;
    if (!el) {
      return;
    }
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    userScrolledArtifact.current = !atBottom;
  }, []);

  const handleClose = useCallback(() => {
    setArtifact((prev) => ({ ...prev, isVisible: false }));
  }, [setArtifact]);

  const [isToolbarVisible, setIsToolbarVisible] = useState(true);

  const isCurrentVersion =
    documents && documents.length > 0
      ? currentVersionIndex === documents.length - 1
      : true;

  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const isMobile = windowWidth ? windowWidth < 768 : false;

  const artifactDefinition = artifactDefinitions.find(
    (definition) => definition.kind === artifact.kind
  );

  if (!artifactDefinition) {
    throw new Error("Artifact definition not found!");
  }

  useEffect(() => {
    if (artifact.documentId !== "init" && artifactDefinition.initialize) {
      artifactDefinition.initialize({
        documentId: artifact.documentId,
        setMetadata,
      });
    }
  }, [artifact.documentId, artifactDefinition, setMetadata]);

  const previewHtml = artifact.preview ?? `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${artifact.title}</title><style>*{box-sizing:border-box}body{margin:0;background:#f8fafc;color:#0f172a;font-family:Inter,system-ui,sans-serif}main{min-height:100vh;padding:32px}section{max-width:960px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:22px;padding:32px;box-shadow:0 10px 30px #0f172a12}p{color:#64748b;margin:8px 0}h1{font-size:32px;margin:8px 0 24px}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.stat{border:1px solid #e2e8f0;border-radius:14px;padding:18px;background:#fff}.stat strong{display:block;font-size:24px;color:#0f172a}.bar{height:10px;margin-top:24px;border-radius:999px;background:#e2e8f0;overflow:hidden}.bar span{display:block;width:68%;height:100%;border-radius:999px;background:#38bdf8}</style></head><body><main><section><p style="color:#0284c7">Live application</p><h1>Preview is building</h1><p>Your generated application preview will appear here.</p><div class="stats"><div class="stat"><small>Status</small><strong>Building</strong></div></div><div class="bar"><span></span></div></section></main></body></html>`;

  const previewScrollbarStyle =
    '<style>html{scrollbar-width:none;-ms-overflow-style:none}html::-webkit-scrollbar,body::-webkit-scrollbar{width:0;height:0;display:none}body{overflow-x:hidden}</style>';
  const previewHtmlForFrame = previewHtml.includes("</head>")
    ? previewHtml.replace("</head>", `${previewScrollbarStyle}</head>`)
    : `${previewScrollbarStyle}${previewHtml}`;
  const previewPathScript = `<script>try{history.replaceState({},'',${JSON.stringify(previewPath)});document.documentElement.dataset.idealyPath=${JSON.stringify(previewPath)};document.title=${JSON.stringify(`${previewPath === "/" ? "Home" : previewPath.slice(1)} · Idealy workspace`)};}catch{}</script>`;
  const previewHtmlForFrameWithPath = previewHtmlForFrame.includes("</body>")
    ? previewHtmlForFrame.replace("</body>", `${previewPathScript}</body>`)
    : `${previewHtmlForFrame}${previewPathScript}`;
  previewHtmlForFrameRef.current = previewHtmlForFrameWithPath;

  const openPreviewWindow = useCallback(() => {
    const previewWindow = window.open(
      "",
      "idealy-preview",
      "popup,width=1280,height=820"
    );
    if (!previewWindow) {
      return;
    }
    previewWindow.document.write(previewHtmlForFrameWithPath);
    previewWindow.document.close();
  }, [previewHtmlForFrameWithPath]);

  if (!artifact.isVisible && !isMobile) {
    return (
      <div
        className="h-dvh w-0 shrink-0 overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        data-testid="artifact"
      />
    );
  }

  if (!artifact.isVisible) {
    return null;
  }

  const consoleEntries = metadata?.outputs ?? [];
  const consoleError =
    consoleEntries
      .filter((o: { status: string }) => o.status === "failed")
      .flatMap((o: { contents: { type: string; value: string }[] }) =>
        o.contents.filter((c) => c.type === "text").map((c) => c.value)
      )
      .join("\n") || undefined;

  const artifactPanel = (
    <>
      <div
        className="idealy-preview-surface relative min-h-0 flex-1 overflow-hidden text-sidebar-foreground"
        data-slot="artifact-content"
        onScroll={handleArtifactScroll}
        ref={artifactContentRef}
      >
        {activeView === "preview" && artifact.kind === "code" ? (
          <div
            className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent"
            key={previewKey}
          >
            <div className="relative flex min-h-0 flex-1 items-stretch justify-center overflow-hidden bg-transparent">
              <div
                className={`relative h-full min-h-0 w-full overflow-hidden bg-background transition-all ${viewport === "mobile" ? "max-w-[390px] rounded-2xl border border-border/70 shadow-2xl" : viewport === "tablet" ? "max-w-[820px] rounded-xl border border-border/60 shadow-xl" : "max-w-none"}`}
              >
                <iframe
                  className="block size-full min-h-0 border-0"
                  srcDoc={previewHtmlForFrameWithPath}
                  title="Generated application preview"
                />
                {artifact.status === "streaming" ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden bg-background/92 backdrop-blur-xl">
                    <div className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-sky-400/15 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-24 -right-24 size-80 rounded-full bg-violet-500/15 blur-3xl" />
                    <div className="relative flex max-w-xs flex-col items-center px-6 text-center">
                      <div className="idealy-build-mark mb-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_0_80px_rgba(56,189,248,0.16)]">
                        <IdealyMark animated className="size-16" size={64} />
                      </div>
                      <p className="text-sm font-semibold tracking-[-0.01em] text-sidebar-foreground">Idealy prépare votre application</p>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">Les agents structurent, construisent et vérifient le premier rendu.</p>
                      <div className="mt-6 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-sky-300/90">
                        <span className="size-1.5 animate-pulse rounded-full bg-sky-300" /> Compilation en cours
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : activeView === "console" ? (
          <div className="flex h-full min-h-0 flex-col bg-sidebar font-mono text-xs text-sidebar-foreground">
            <div className="flex shrink-0 items-center justify-between border-b border-sidebar-border/60 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-sidebar-foreground">
                <TerminalSquare className="size-4 text-sky-300" /> Developer tools
              </div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-300">{consoleError ? "Error" : "Ready"}</span>
            </div>
            <div className="flex shrink-0 items-center gap-1 border-b border-sidebar-border/50 px-3 py-2">
              {(["console", "network", "build"] as const).map((tab) => (
                <button
                  className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors ${consoleTab === tab ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"}`}
                  key={tab}
                  onClick={() => setConsoleTab(tab)}
                  type="button"
                >
                  {tab}
                </button>
              ))}
              <button
                className="ml-auto rounded-md px-2.5 py-1.5 text-[10px] text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                onClick={() => setMetadata({ outputs: [] })}
                type="button"
              >
                Clear
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-4">
              {consoleTab === "network" ? (
                <div className="space-y-2 text-muted-foreground">
                  <div className="grid grid-cols-[auto_1fr_auto] gap-3 border-b border-sidebar-border/40 pb-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    <span>Status</span><span>Request</span><span>Type</span>
                  </div>
                  <div className="grid grid-cols-[auto_1fr_auto] gap-3 rounded-md border border-sidebar-border/40 bg-background/20 px-3 py-2 text-[11px]"><span className="text-emerald-300">200</span><span>/api/chat</span><span>SSE</span></div>
                  <div className="grid grid-cols-[auto_1fr_auto] gap-3 rounded-md border border-sidebar-border/40 bg-background/20 px-3 py-2 text-[11px]"><span className="text-emerald-300">200</span><span>srcdoc://preview</span><span>Document</span></div>
                </div>
              ) : consoleTab === "build" ? (
                <div className="space-y-2 text-[11px] text-muted-foreground">
                  <p><span className="text-emerald-300">✓</span> Preview bundle prepared</p>
                  <p><span className="text-emerald-300">✓</span> Responsive viewport mounted</p>
                  <p><span className="text-sky-300">›</span> {artifact.status === "streaming" ? "Streaming generated code" : "Build ready"}</p>
                </div>
              ) : consoleEntries.length > 0 ? (
                <div className="space-y-2">
                  {consoleEntries.map((entry: { id: string; status: string; contents: { type: string; value: string }[] }) => (
                    <div className="rounded-md border border-sidebar-border/50 bg-background/20 px-3 py-2" key={entry.id}>
                      <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground"><span className={entry.status === "failed" ? "text-red-300" : "text-emerald-300"}>{entry.status}</span><span>runtime</span></div>
                      {entry.contents.length > 0 ? entry.contents.map((content, index) => <p className="whitespace-pre-wrap text-sidebar-foreground/80" key={`${entry.id}-${index}`}>{content.value}</p>) : <p className="text-muted-foreground">No output yet.</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center text-muted-foreground">
                  <TerminalSquare className="mb-3 size-6 text-sky-300/70" />
                  <p className="text-sm font-medium text-sidebar-foreground">No console output yet</p>
                  <p className="mt-1 max-w-xs text-[11px] leading-5">Runtime logs, network events and build messages will appear here as the preview runs.</p>
                </div>
              )}
            </div>
          </div>
        ) : activeView === "database" ? (
          <div className="flex h-full min-h-0 flex-col overflow-auto bg-sidebar text-sidebar-foreground">
            <div className="flex shrink-0 items-center justify-between border-b border-sidebar-border/60 px-5 py-4">
              <div><div className="flex items-center gap-2 text-sm font-semibold"><DatabaseIcon className="size-4 text-violet-300" /> Database</div><p className="mt-1 text-[11px] text-muted-foreground">Schema workspace</p></div>
              <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] text-amber-200">Demo mode</span>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
              {[{ name: "users", rows: "—", note: "Authentication" }, { name: "projects", rows: "—", note: "Generated apps" }, { name: "documents", rows: "—", note: "Versions & code" }].map((table) => (
                <div className="rounded-xl border border-sidebar-border/60 bg-background/25 p-4" key={table.name}>
                  <div className="flex items-center gap-2"><DatabaseIcon className="size-3.5 text-violet-300" /><span className="font-mono text-sm">{table.name}</span></div>
                  <p className="mt-3 text-[11px] text-muted-foreground">{table.note}</p>
                  <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground"><span>Rows</span><span className="font-mono text-sidebar-foreground">{table.rows}</span></div>
                </div>
              ))}
            </div>
            <div className="mx-5 rounded-xl border border-dashed border-violet-300/25 bg-violet-300/5 p-4 text-[11px] leading-5 text-muted-foreground">The live database connection will appear here once the backend is connected. The demo keeps this surface read-only.</div>
          </div>
        ) : (
          <div className="flex h-full min-h-0 overflow-hidden">
            <aside className="hidden w-56 shrink-0 border-r border-sidebar-border/60 bg-sidebar/70 p-3 sm:block">
              <div className="mb-3 flex items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"><span>Files</span><Folder className="size-3.5" /></div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2 rounded-md bg-sidebar-accent px-2.5 py-2 text-sidebar-accent-foreground"><FileCode2 className="size-3.5 text-sky-300" /><span className="truncate">page.tsx</span></div>
                <div className="flex items-center gap-2 rounded-md px-2.5 py-2 text-muted-foreground"><FileJson className="size-3.5 text-amber-300" /><span>package.json</span></div>
                <div className="flex items-center gap-2 rounded-md px-2.5 py-2 text-muted-foreground"><FileCode2 className="size-3.5 text-violet-300" /><span>app/layout.tsx</span></div>
                <div className="flex items-center gap-2 rounded-md px-2.5 py-2 text-muted-foreground"><FileCode2 className="size-3.5 text-emerald-300" /><span>api/chat/route.ts</span></div>
              </div>
            </aside>
            <div className="min-w-0 flex-1 overflow-auto">
              <artifactDefinition.content
                content={
                  isCurrentVersion
                    ? artifact.content
                    : getDocumentContentById(currentVersionIndex)
                }
                currentVersionIndex={currentVersionIndex}
                getDocumentContentById={getDocumentContentById}
                isCurrentVersion={isCurrentVersion}
                isInline={false}
                isLoading={isDocumentsFetching && !artifact.content}
                metadata={metadata}
                mode={mode}
                onSaveContent={saveContent}
                setMetadata={setMetadata}
                status={artifact.status}
                suggestions={[]}
                title={artifact.title}
              />
            </div>
          </div>
        )}
      </div>
      <AnimatePresence>
        {!isCurrentVersion && (
          <VersionFooter
            currentVersionIndex={currentVersionIndex}
            documents={documents}
            handleVersionChange={handleVersionChange}
            mode={mode}
            setMode={setMode}
          />
        )}
      </AnimatePresence>
    </>
  );

  if (isMobile) {
    return (
      <motion.div
        animate={{
          borderRadius: 0,
          height: windowHeight,
          opacity: 1,
          width: "100dvw",
          x: 0,
          y: 0,
        }}
        className="fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden bg-sidebar text-sidebar-foreground"
        data-testid="artifact"
        exit={{ opacity: 0, scale: 0.95 }}
        initial={{
          borderRadius: 50,
          height: artifact.boundingBox.height,
          opacity: 1,
          width: artifact.boundingBox.width,
          x: artifact.boundingBox.left,
          y: artifact.boundingBox.top,
        }}
        transition={{ damping: 30, stiffness: 300, type: "spring" }}
      >
        {artifactPanel}
      </motion.div>
    );
  }

  return (
    <div
      className={`${isExpanded ? "fixed inset-x-0 bottom-0 top-12 z-20 w-full border-l-0" : "min-w-0 flex-1 border-l"} idealy-preview-surface flex h-dvh shrink-0 flex-col overflow-hidden border-sidebar-border text-sidebar-foreground transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]`}
      data-testid="artifact"
    >
      {artifactPanel}
    </div>
  );
}

export const Artifact = memo(PureArtifact, (prevProps, nextProps) => {
  if (prevProps.status !== nextProps.status) {
    return false;
  }
  if (!equal(prevProps.votes, nextProps.votes)) {
    return false;
  }
  if (prevProps.input !== nextProps.input) {
    return false;
  }
  if (prevProps.messages.length !== nextProps.messages.length) {
    return false;
  }
  if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
    return false;
  }

  return true;
});
