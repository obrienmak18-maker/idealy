import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AssistantRemoteService } from "../services/assistantRemote";
import { BackendHistoryService } from "../services/backendHistory";
import { StorageService } from "../services/storage";
import { authenticatedFetch } from "../services/firebase";
import { buildRunForMessage } from "../services/agentRegistry";
import { useFirestoreProjectSync } from "../hooks/useFirestoreSync";
import { getConversationArtifactId } from "../services/conversationArtifacts";
import type {
  Artifact,
  AssistantToolActivity,
  Attachment,
  Conversation,
  GenerationStatus,
  IntentionMode,
  Message,
  MissionFileActivity,
  MissionBuildVerification,
  MissionRun,
  MissionWorkspaceFile,
  SubAgentProgress,
  Space,
  Theme,
} from "../types";

interface ConfirmModalData {
  confirmLabel?: string;
  isDestructive?: boolean;
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  title: string;
}

interface AppContextValue {
  activeArtifact: Artifact | undefined;
  activeConversation: Conversation | undefined;
  activeMessages: Message[];
  activePage: AppPage;
  activeSpace: Space | undefined;

  artifacts: Artifact[];
  closeArtifact: () => void;
  closeConfirmModal: () => void;

  confirmModal: ConfirmModalData | null;

  conversations: Conversation[];
  conversationsHasMore: boolean;
  isLoadingConversations: boolean;
  loadMoreConversations: () => Promise<void>;
  createConversation: (spaceId?: string, title?: string) => string;
  createSpace: (
    name: string,
    description: string,
    instructions: string,
  ) => void;

  deepThink: boolean;
  deleteConversation: (id: string) => void;
  deleteSpace: (id: string) => void;

  draft: string;
  exportConversation: (id: string) => void;

  generationStatus: GenerationStatus;

  // Modals & Navigation
  isCommandPaletteOpen: boolean;
  isMobileDrawerOpen: boolean;
  isSettingsOpen: boolean;
  isSpaceModalOpen: boolean;

  messages: Message[];

  mode: IntentionMode;
  openArtifact: (id: string) => void;
  openConfirmModal: (data: Omit<ConfirmModalData, "isOpen">) => void;
  renameConversation: (id: string, newTitle: string) => void;
  sendMessage: (
    content: string,
    attachments?: Attachment[],
    options?: { deepThink?: boolean; webSearch?: boolean },
  ) => Promise<void>;
  setActiveConversationId: (id: string) => void;
  setActivePage: (page: AppPage) => void;
  setActiveSpaceId: (id: string) => void;
  setDeepThink: (deepThink: boolean) => void;
  setDraft: (text: string) => void;
  setIsCommandPaletteOpen: (open: boolean) => void;
  setIsMobileDrawerOpen: (open: boolean) => void;
  setIsSettingsOpen: (open: boolean) => void;
  setIsSpaceModalOpen: (open: boolean) => void;
  setMode: (mode: IntentionMode) => void;
  setTheme: (theme: Theme) => void;
  setWebSearch: (webSearch: boolean) => void;

  spaces: Space[];
  startMission: (
    missionId: string,
    assistantMessageId: string,
  ) => Promise<void>;
  stopGeneration: () => void;
  theme: Theme;
  toggleArchiveConversation: (id: string) => void;
  togglePinConversation: (id: string) => void;
  updateSpace: (id: string, updates: Partial<Space>) => void;
  updateArtifactContent: (conversationId: string, path: string, content: string) => void;
  webSearch: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export type AppPage =
  | "chat"
  | "connectors"
  | "library"
  | "agents"
  | "settings"
  | "welcome"
  | "about"
  | "docs"
  | "support"
  | "pricing"
  | "plugins"
  | "privacy"
  | "terms"
  | "eula"
  | "login"
  | "onboarding"
  | "authAction";

const pagePaths: Record<AppPage, string> = {
  about: "/about",
  agents: "/agents",
  chat: "/studio",
  connectors: "/connectors",
  docs: "/docs",
  library: "/library",
  pricing: "/pricing",
  plugins: "/plugins",
  privacy: "/privacy",
  terms: "/terms",
  eula: "/eula",
  login: "/login",
  onboarding: "/onboarding",
  authAction: "/auth/action",
  settings: "/settings",
  support: "/support",
  welcome: "/welcome",
};

function pageFromPath(pathname: string): AppPage {
  const path = pathname.replace(/\/$/, "") || "/";
  const match = (Object.entries(pagePaths) as [AppPage, string][]).find(
    ([, route]) => route === path,
  );
  if (path === "/register") return "login";
  if (path.startsWith("/settings/")) return "settings";
  if (path.startsWith("/connectors/")) return "connectors";
  if (path.startsWith("/docs/")) return "docs";
  if (path === "/") {
    if (typeof window !== "undefined") {
      const hasSession =
        window.localStorage.getItem("idealy_session") ||
        window.localStorage.getItem("idealy_user_profile") ||
        window.localStorage.getItem("idealy_profile");
      if (!hasSession) {
        return "welcome";
      }
    }
  }
  return match?.[0] ?? "chat";
}

function conversationTitleFromPrompt(
  content: string,
  attachments: Attachment[] = [],
): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized && attachments.length) {
    const firstName = attachments[0]?.name?.trim();
    return firstName ? `Fichier : ${firstName}` : "Fichiers partagés";
  }

  const concise = normalized
    .replace(/^aide(?:z)?-moi\s+(?:à|de)\s+/i, "")
    .replace(/^je\s+(?:voudrais|veux|souhaite)\s+/i, "")
    .replace(/[\s:;,.!?]+$/u, "")
    .replace(/\s+(?:pour|avec|de|du|des|à|au|sur|dans|et)$/iu, "")
    .trim();
  const title = concise || normalized;
  const points = Array.from(title);
  if (points.length <= 44) {
    return points.join("").charAt(0).toLocaleUpperCase("fr-FR") + points.join("").slice(1);
  }
  const preview = points.slice(0, 44).join("");
  const wordBoundary = preview.lastIndexOf(" ");
  const shortened = preview.slice(0, wordBoundary > 26 ? wordBoundary : 44).trim();
  return `${shortened.charAt(0).toLocaleUpperCase("fr-FR")}${shortened.slice(1)}…`;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [activePage, setActivePageState] = useState<AppPage>(() =>
    typeof window === "undefined"
      ? "chat"
      : pageFromPath(window.location.pathname),
  );
  // Theme state
  const [theme, setThemeState] = useState<Theme>(() =>
    StorageService.loadTheme(),
  );

  // Data states
  const [spaces, setSpaces] = useState<Space[]>(() =>
    StorageService.loadSpaces(),
  );
  const [activeSpaceId, setActiveSpaceIdState] = useState<string>(() =>
    StorageService.loadActiveSpaceId(),
  );

  const [conversations, setConversations] = useState<Conversation[]>(() =>
    StorageService.loadConversations(),
  );
  const [activeConversationId, setActiveConversationIdState] = useState<string>(
    () => StorageService.loadActiveConversationId(),
  );

  const [messages, setMessages] = useState<Message[]>(() =>
    StorageService.loadMessages(),
  );
  const [artifacts, setArtifacts] = useState<Artifact[]>(() =>
    StorageService.loadArtifacts(),
  );

  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(() =>
    getConversationArtifactId(
      StorageService.loadArtifacts(),
      StorageService.loadActiveConversationId(),
    ),
  );
  const [generationStatus, setGenerationStatus] =
    useState<GenerationStatus>("idle");
  const [deepThink, setDeepThink] = useState<boolean>(true);
  const [webSearch, setWebSearch] = useState<boolean>(false);

  // Firestore Project Sync
  const { project: syncedProject } = useFirestoreProjectSync(activeConversationId);
  useEffect(() => {
    if (!syncedProject?.files?.length || !activeConversationId) return;
    const firstCodeFile = syncedProject.files.find((f) => f.content);
    if (!firstCodeFile?.content) return;
    const hasExisting = artifacts.some((a) => a.conversationId === activeConversationId);
    if (!hasExisting) {
      const syncedArtifact: Artifact = {
        id: crypto.randomUUID(),
        conversationId: activeConversationId,
        title: syncedProject.title || "Projet Idealy",
        type: "code",
        content: firstCodeFile.content,
        createdAt: Date.now(),
      };
      setArtifacts((prev) => [syncedArtifact, ...prev]);
    }
  }, [syncedProject, activeConversationId, artifacts]);

  // Modals state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalData | null>(
    null,
  );

  // Controller for stream interruption
  const abortControllerRef = useRef<AbortController | null>(null);
  const missionStartsRef = useRef<Set<string>>(new Set());
  const historyLoadsRef = useRef<Set<string>>(new Set());
  const [historyReady, setHistoryReady] = useState(false);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [conversationsHasMore, setConversationsHasMore] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  // Active items resolution
  const activeSpace = spaces.find((s) => s.id === activeSpaceId) || spaces[0];
  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) ||
    conversations[0];
  const activeMessages = messages.filter(
    (m) => m.conversationId === activeConversation?.id,
  );
  // An artifact belongs to exactly one conversation. Never render a stale
  // sidecar from a different conversation while navigation is updating.
  const activeArtifact = artifacts.find(
    (artifact) =>
      artifact.id === activeArtifactId &&
      artifact.conversationId === activeConversation?.id,
  );

  // Draft and mode are bound to activeConversation
  const draft = activeConversation?.draft || "";
  const mode = activeConversation?.selectedMode || "chat";

  // Theme application
  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      theme === "dark" ||
      (theme === "system" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDark) {
      root.classList.add("dark");
      document.body.setAttribute("data-ds-dark-theme", "");
    } else {
      root.classList.remove("dark");
      document.body.removeAttribute("data-ds-dark-theme");
    }
  }, [theme]);

  useEffect(() => {
    const syncRoute = () =>
      setActivePageState(pageFromPath(window.location.pathname));
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  const setActivePage = (page: AppPage) => {
    setActivePageState(page);
    const nextPath = pagePaths[page];
    if (window.location.pathname !== nextPath)
      window.history.pushState(null, "", nextPath);
    setIsMobileDrawerOpen(false);
  };

  useEffect(() => {
    let cancelled = false;
    BackendHistoryService.listAndImport()
      .then((page) => {
        if (cancelled) return;
        setHistoryCursor(page.cursor);
        setConversationsHasMore(page.hasMore);
        if (page.conversations.length) {
          setConversations((current) => {
            const currentIds = new Set(
              current.map((conversation) => conversation.id),
            );
            const next = [
              ...page.conversations.filter(
                (conversation) => !currentIds.has(conversation.id),
              ),
              ...current,
            ];
            StorageService.saveConversations(next);
            return next;
          });
        }
      })
      .catch((error) => {
        console.warn("Backend history sync failed", error);
      })
      .finally(() => {
        if (!cancelled) setHistoryReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMoreConversations = async () => {
    if (!historyCursor || !conversationsHasMore || isLoadingConversations)
      return;
    setIsLoadingConversations(true);
    try {
      const page = await BackendHistoryService.listAndImport(historyCursor);
      setHistoryCursor(page.cursor);
      setConversationsHasMore(page.hasMore);
      if (page.conversations.length) {
        setConversations((current) => {
          const currentIds = new Set(
            current.map((conversation) => conversation.id),
          );
          const next = [
            ...current,
            ...page.conversations.filter(
              (conversation) => !currentIds.has(conversation.id),
            ),
          ];
          StorageService.saveConversations(next);
          return next;
        });
      }
    } catch (error) {
      console.warn("Loading more conversations failed", error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  useEffect(() => {
    if (
      !historyReady ||
      !activeConversation?.id ||
      historyLoadsRef.current.has(activeConversation.id)
    )
      return;
    historyLoadsRef.current.add(activeConversation.id);
    let cancelled = false;
    BackendHistoryService.loadMessages(activeConversation.id)
      .then((remoteMessages) => {
        if (cancelled) {
          historyLoadsRef.current.delete(activeConversation.id);
          return;
        }
        if (!remoteMessages?.length) return;
        setMessages((current) => {
          const local = current.filter(
            (message) => message.conversationId === activeConversation.id,
          );
          const matchedLocalIds = new Set<string>();
          const mergedRemote = remoteMessages.map((remote) => {
            const match = local.find(
              (candidate) =>
                !matchedLocalIds.has(candidate.id) &&
                candidate.role === remote.role &&
                candidate.content === remote.content &&
                Math.abs(candidate.createdAt - remote.createdAt) < 5 * 60_000,
            );
            if (!match) return remote;
            matchedLocalIds.add(match.id);
            return {
              ...remote,
              ...match,
              attachments: remote.attachments?.length
                ? remote.attachments
                : match.attachments,
              content: remote.content,
              createdAt: remote.createdAt,
              conversationId: remote.conversationId,
            };
          });
          const merged = [
            ...mergedRemote,
            ...local.filter((message) => !matchedLocalIds.has(message.id)),
          ].sort((left, right) => left.createdAt - right.createdAt);
          const next = [
            ...current.filter(
              (message) => message.conversationId !== activeConversation.id,
            ),
            ...merged,
          ];
          StorageService.saveMessages(next);
          return next;
        });
      })
      .catch((error) => {
        historyLoadsRef.current.delete(activeConversation.id);
        console.warn("Conversation history sync failed", error);
      });
    return () => {
      cancelled = true;
    };
  }, [activeConversation?.id, historyReady]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    StorageService.saveTheme(newTheme);
  };

  const setActiveSpaceId = (spaceId: string) => {
    setActiveSpaceIdState(spaceId);
    StorageService.saveActiveSpaceId(spaceId);
  };

  const setActiveConversationId = (convId: string) => {
    // Restore only a deliverable owned by the destination conversation.
    // New conversations therefore start with an empty workbench.
    setActiveArtifactId(getConversationArtifactId(artifacts, convId));
    setActiveConversationIdState(convId);
    StorageService.saveActiveConversationId(convId);
    setIsMobileDrawerOpen(false);
    setActivePage("chat");
  };

  // Draft handling with instant persistence
  const setDraft = useCallback(
    (text: string) => {
      if (!activeConversation) {
        return;
      }
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === activeConversation.id ? { ...c, draft: text } : c,
        );
        StorageService.saveConversations(updated);
        return updated;
      });
    },
    [activeConversation],
  );

  // Mode handling
  const setMode = useCallback(
    (newMode: IntentionMode) => {
      if (!activeConversation) {
        return;
      }
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === activeConversation.id ? { ...c, selectedMode: newMode } : c,
        );
        StorageService.saveConversations(updated);
        return updated;
      });
    },
    [activeConversation],
  );

  // Space management
  const createSpace = (
    name: string,
    description: string,
    instructions: string,
  ) => {
    const newSpace: Space = {
      createdAt: Date.now(),
      description: description.trim(),
      id: `space-${Date.now()}`,
      instructions: instructions.trim(),
      name: name.trim() || "Nouvel Espace",
    };
    const next = [...spaces, newSpace];
    setSpaces(next);
    StorageService.saveSpaces(next);
    setActiveSpaceId(newSpace.id);
  };

  const updateSpace = (id: string, updates: Partial<Space>) => {
    const next = spaces.map((s) => (s.id === id ? { ...s, ...updates } : s));
    setSpaces(next);
    StorageService.saveSpaces(next);
  };

  const deleteSpace = (id: string) => {
    if (spaces.length <= 1) {
      return; // Keep at least one space
    }
    const next = spaces.filter((s) => s.id !== id);
    setSpaces(next);
    StorageService.saveSpaces(next);
    if (activeSpaceId === id) {
      setActiveSpaceId(next[0].id);
    }
  };

  // Conversation management
  const createConversation = (spaceId?: string, title?: string): string => {
    const targetSpace = spaceId || activeSpaceId || "space-general";
    const activeConversationHasMessages = activeConversation
      ? messages.some(
          (message) => message.conversationId === activeConversation.id,
        )
      : false;
    const activeConversationHasArtifacts = activeConversation
      ? artifacts.some(
          (artifact) => artifact.conversationId === activeConversation.id,
        )
      : false;
    if (
      !title &&
      activeConversation?.id.startsWith("conv-") &&
      activeConversation.spaceId === targetSpace &&
      !activeConversation.isArchived &&
      !activeConversation.draft?.trim() &&
      !activeConversationHasMessages &&
      !activeConversationHasArtifacts
    ) {
      setActiveConversationId(activeConversation.id);
      return activeConversation.id;
    }

    const newConv: Conversation = {
      createdAt: Date.now(),
      draft: "",
      id: `conv-${crypto.randomUUID()}`,
      isArchived: false,
      isPinned: false,
      selectedMode: "chat",
      spaceId: targetSpace,
      title: title || "Nouvelle conversation",
      updatedAt: Date.now(),
    };
    const next = [newConv, ...conversations];
    setConversations(next);
    StorageService.saveConversations(next);
    setActivePage("chat");
    setActiveConversationId(newConv.id);
    return newConv.id;
  };

  const renameConversation = (id: string, newTitle: string) => {
    setConversations((current) => {
      const next = current.map((conversation) =>
        conversation.id === id
          ? { ...conversation, title: newTitle.trim() || conversation.title }
          : conversation,
      );
      StorageService.saveConversations(next);
      return next;
    });
  };

  const togglePinConversation = (id: string) => {
    const next = conversations.map((c) =>
      c.id === id ? { ...c, isPinned: !c.isPinned } : c,
    );
    setConversations(next);
    StorageService.saveConversations(next);
  };

  const toggleArchiveConversation = (id: string) => {
    const next = conversations.map((c) =>
      c.id === id ? { ...c, isArchived: !c.isArchived } : c,
    );
    setConversations(next);
    StorageService.saveConversations(next);
  };

  const deleteConversation = (id: string) => {
    const next = conversations.filter((c) => c.id !== id);
    const filteredMessages = messages.filter((m) => m.conversationId !== id);
    setConversations(next);
    setMessages(filteredMessages);
    StorageService.saveConversations(next);
    StorageService.saveMessages(filteredMessages);

    if (activeConversationId === id) {
      const remaining = next.filter(
        (c) => c.spaceId === activeSpaceId && !c.isArchived,
      );
      if (remaining.length > 0) {
        setActiveConversationId(remaining[0].id);
      } else if (next.length > 0) {
        setActiveConversationId(next[0].id);
      } else {
        createConversation(activeSpaceId);
      }
    }
  };

  const exportConversation = (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (!conv) {
      return;
    }
    const convMessages = messages.filter((m) => m.conversationId === id);

    let text = `# ${conv.title}\n*Exporté depuis Idealy le ${new Date().toLocaleString("fr-FR")}*\n\n---\n\n`;
    for (const msg of convMessages) {
      const roleName = msg.role === "user" ? "Utilisateur" : "Assistant Idealy";
      const time = new Date(msg.createdAt).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      text += `### ${roleName} (${time}) [Mode: ${msg.mode}]\n\n${msg.content}\n\n---\n\n`;
    }

    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${conv.title.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Artifact management
  const openArtifact = (id: string) => {
    const belongsToActiveConversation = artifacts.some(
      (artifact) =>
        artifact.id === id &&
        artifact.conversationId === activeConversation?.id,
    );
    if (belongsToActiveConversation) setActiveArtifactId(id);
  };

  const updateArtifactContent = useCallback(
    (conversationId: string, path: string, content: string) => {
      const normalizedPath = path.replaceAll("\\", "/").replace(/^\/+/, "");
      setArtifacts((current) => {
        const existing = current.find(
          (artifact) =>
            artifact.conversationId === conversationId &&
            artifact.title.replaceAll("\\", "/").replace(/^\/+/, "") === normalizedPath,
        );
        const now = Date.now();
        const nextArtifact: Artifact = existing
          ? { ...existing, content, createdAt: now }
          : {
              content,
              conversationId,
              createdAt: now,
              id: crypto.randomUUID(),
              language: normalizedPath.split(".").pop() ?? "text",
              title: normalizedPath,
              type: "code",
            };
        const next = existing
          ? current.map((artifact) =>
              artifact.id === existing.id ? nextArtifact : artifact,
            )
          : [nextArtifact, ...current];
        StorageService.saveArtifacts(next);
        return next;
      });
    },
    [],
  );

  const closeArtifact = () => {
    setActiveArtifactId(null);
  };

  // Send message and generation lifecycle
  const sendMessage = async (
    content: string,
    attachments?: Attachment[],
    sendOpts?: { deepThink?: boolean; webSearch?: boolean },
  ) => {
    if (
      (!content.trim() && !attachments?.length) ||
      !activeConversation ||
      generationStatus === "receiving" ||
      generationStatus === "sending"
    ) {
      return;
    }

    const currentConvId = activeConversation.id;
    const currentMode = activeConversation.selectedMode;
    const currentSpace = activeSpace;
    const useDeepThink = sendOpts?.deepThink ?? deepThink;
    const useWebSearch = sendOpts?.webSearch ?? webSearch;

    // 1. Create and add user message
    const userMessage: Message = {
      attachments:
        attachments && attachments.length > 0 ? attachments : undefined,
      content: content.trim(),
      conversationId: currentConvId,
      createdAt: Date.now(),
      id: `msg-${Date.now()}`,
      mode: currentMode,
      role: "user",
    };

    // Clear draft immediately
    setDraft("");

    // Update conversation title if first message
    const convMsgCount = messages.filter(
      (m) => m.conversationId === currentConvId,
    ).length;
    if (
      convMsgCount === 0 ||
      activeConversation.title === "Nouvelle conversation"
    ) {
      const suggestedTitle = conversationTitleFromPrompt(content, attachments);
      renameConversation(currentConvId, suggestedTitle);
    }

    // 2. Create placeholder assistant message with routed Run
    const initialRun = buildRunForMessage(content, "", {
      mode: currentMode,
      deepThink: useDeepThink,
    });
    const assistantMessageId = `msg-${Date.now() + 1}`;
    const initialAssistantMessage: Message = {
      content: "",
      conversationId: currentConvId,
      createdAt: Date.now(),
      id: assistantMessageId,
      isPartial: true,
      mode: currentMode,
      reasoning: "",
      role: "assistant",
      run: initialRun,
    };

    const nextMessages = [...messages, userMessage, initialAssistantMessage];
    setMessages(nextMessages);
    StorageService.saveMessages(nextMessages);

    // 3. Initiate stream
    setGenerationStatus("sending");
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let accumulatedContent = "";
    let accumulatedReasoning = "";

    try {
      setGenerationStatus("receiving");
      await AssistantRemoteService.streamResponse({
        callbacks: {
          onArtifact: (newArt) => {
            const artifact: Artifact = {
              ...newArt,
              conversationId: currentConvId,
              createdAt: Date.now(),
              id: `art-${Date.now()}`,
            };
            setArtifacts((prev) => {
              const updated = [artifact, ...prev];
              StorageService.saveArtifacts(updated);
              return updated;
            });
            // Link artifact to the message
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? {
                      ...m,
                      artifactIds: [...(m.artifactIds || []), artifact.id],
                    }
                  : m,
              ),
            );
            // Open artifact sidecar automatically in Produce mode
            setActiveArtifactId(artifact.id);
          },
          onChunk: (chunk: string) => {
            accumulatedContent += chunk;
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== assistantMessageId) return m;
                const updatedRun = buildRunForMessage(content, accumulatedContent, {
                  mode: currentMode,
                  reasoning: accumulatedReasoning,
                });
                return { ...m, content: accumulatedContent, run: updatedRun };
              }),
            );
          },
          onComplete: (duration?: number) => {
            const isAborted = abortController.signal.aborted;
            const finalStatus: "interrupted" | "delivered" = isAborted
              ? "interrupted"
              : "delivered";
            setGenerationStatus(isAborted ? "aborted" : "completed");
            setMessages((prev) => {
              const updated: Message[] = prev.map((m) => {
                if (m.id !== assistantMessageId) return m;
                const finalRun = buildRunForMessage(content, accumulatedContent, {
                  mode: currentMode,
                  reasoning: accumulatedReasoning,
                });
                return {
                  ...m,
                  isPartial: false,
                  reasoningDuration: duration ?? m.reasoningDuration,
                  run: finalRun,
                  status: finalStatus,
                };
              });
              StorageService.saveMessages(updated);
              return updated;
            });
          },
          onMissionPlan: (missionId, plan) => {
            setMessages((prev) => {
              const updated = prev.map((m) =>
                m.id === assistantMessageId
                  ? {
                      ...m,
                      mission: {
                        id: missionId,
                        plan,
                        status: "planned" as const,
                      },
                    }
                  : m,
              );
              StorageService.saveMessages(updated);
              return updated;
            });
          },
          onMissionRoute: (route) => {
            setMessages((prev) => {
              const updated = prev.map((m) =>
                m.id === assistantMessageId && m.mission
                  ? { ...m, mission: { ...m.mission, route } }
                  : m,
              );
              StorageService.saveMessages(updated);
              return updated;
            });
          },
          onToolActivity: (activity: AssistantToolActivity) => {
            setMessages((prev) => {
              const updated = prev.map((message) => {
                if (message.id !== assistantMessageId) return message;
                const activities = message.activities ?? [];
                const existing = activities.findIndex(
                  (item) => item.toolCallId === activity.toolCallId,
                );
                const nextActivities = [...activities];
                if (existing >= 0) nextActivities[existing] = activity;
                else nextActivities.push(activity);
                return { ...message, activities: nextActivities };
              });
              StorageService.saveMessages(updated);
              return updated;
            });
          },
          onMissionFileEvent: (event: MissionFileActivity) => {
            setMessages((prev) => {
              const updated = prev.map((message) => {
                if (message.id !== assistantMessageId) return message;
                const fileEvents = message.fileEvents ?? [];
                if (
                  fileEvents.some(
                    (item) =>
                      item.missionId === event.missionId &&
                      item.sequence === event.sequence,
                  )
                ) {
                  return message;
                }
                return {
                  ...message,
                  fileEvents: [...fileEvents, event].slice(-24),
                };
              });
              StorageService.saveMessages(updated);
              return updated;
            });
          },
          onSubAgentProgress: (progress: SubAgentProgress) => {
            setMessages((prev) => {
              const updated = prev.map((message) => {
                if (message.id !== assistantMessageId) return message;
                const subagents = message.subagents ?? [];
                const existingIndex = subagents.findIndex(
                  (item) => item.timestamp === progress.timestamp,
                );
                const nextSubagents = [...subagents];
                if (existingIndex >= 0) nextSubagents[existingIndex] = progress;
                else nextSubagents.push(progress);
                return { ...message, subagents: nextSubagents.slice(-3) };
              });
              StorageService.saveMessages(updated);
              return updated;
            });
          },
          onReasoningChunk: (chunk: string) => {
            accumulatedReasoning += chunk;
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== assistantMessageId) return m;
                const updatedRun = buildRunForMessage(content, accumulatedContent, {
                  mode: currentMode,
                  reasoning: accumulatedReasoning,
                });
                return { ...m, reasoning: accumulatedReasoning, run: updatedRun };
              }),
            );
          },
        },
        content: content.trim(),
        attachments,
        conversationId: currentConvId,
        conversationTitle: activeConversation.title,
        deepThink: useDeepThink,
        mode: currentMode,
        signal: abortController.signal,
        spaceInstructions: currentSpace?.instructions,
        webSearch: useWebSearch,
      });
    } catch (err) {
      setGenerationStatus("error");
      const errStatus = "error";
      setMessages((prev) => {
        const updated: Message[] = prev.map((m) =>
          m.id === assistantMessageId
            ? {
                ...m,
                content:
                  accumulatedContent ||
                  (err instanceof Error
                    ? err.message
                    : "Une erreur est survenue lors de la génération de la réponse."),
                isPartial: false,
                status: errStatus,
              }
            : m,
        );
        StorageService.saveMessages(updated);
        return updated;
      });
    } finally {
      abortControllerRef.current = null;
      setTimeout(() => {
        setGenerationStatus((s) =>
          s === "completed" || s === "aborted" || s === "error" ? "idle" : s,
        );
      }, 1500);
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setGenerationStatus("aborted");
    }
  };

  const startMission = async (
    missionId: string,
    assistantMessageId: string,
  ) => {
    if (missionStartsRef.current.has(missionId)) {
      return;
    }
    const sourceMessage = messages.find(
      (message) => message.id === assistantMessageId,
    );
    const mission = sourceMessage?.mission;
    if (
      !mission ||
      mission.id !== missionId ||
      mission.status === "ready" ||
      mission.status === "building"
    ) {
      return;
    }

    missionStartsRef.current.add(missionId);
    const idempotencyKey = mission.idempotencyKey || crypto.randomUUID();
    const updateMission = (updates: Partial<MissionRun>) => {
      setMessages((prev) => {
        const updated = prev.map((message) =>
          message.id === assistantMessageId && message.mission
            ? { ...message, mission: { ...message.mission, ...updates } }
            : message,
        );
        StorageService.saveMessages(updated);
        return updated;
      });
    };

    updateMission({ error: undefined, idempotencyKey, status: "building" });

    try {
      const response = await authenticatedFetch(
        `/api/idealy/missions/${encodeURIComponent(missionId)}/squad`,
        {
          body: JSON.stringify({ idempotencyKey }),
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const result = (await response.json().catch(() => null)) as {
        status?: unknown;
        error?: unknown;
        buildVerification?: {
          command?: unknown;
          durationMs?: unknown;
          error?: unknown;
          status?: unknown;
          stderr?: unknown;
          stdout?: unknown;
        };
      } | null;
      if (!response.ok) {
        const message =
          typeof result?.error === "string"
            ? result.error
            : `Le backend a refusé le lancement de la mission (${response.status}).`;
        throw new Error(message);
      }

      let files: MissionWorkspaceFile[] = [];
      let fileLoadError: string | undefined;
      try {
        const filesResponse = await authenticatedFetch(
          `/api/idealy/missions/${encodeURIComponent(missionId)}/files`,
          {
            credentials: "same-origin",
          },
        );
        const filePayload = (await filesResponse.json().catch(() => null)) as {
          files?: unknown;
          error?: unknown;
        } | null;
        if (!filesResponse.ok) {
          fileLoadError =
            typeof filePayload?.error === "string"
              ? filePayload.error
              : "La mission est terminée, mais ses fichiers ne sont pas encore accessibles.";
        } else if (Array.isArray(filePayload?.files)) {
          files = filePayload.files.filter(
            (file): file is MissionWorkspaceFile =>
              Boolean(
                file &&
                  typeof file === "object" &&
                  "path" in file &&
                  typeof file.path === "string" &&
                  "content" in file &&
                  typeof file.content === "string",
              ),
          );
        }
      } catch {
        fileLoadError =
          "La mission est terminée, mais ses fichiers n’ont pas pu être chargés.";
      }

      const status: MissionRun["status"] =
        result?.status === "ready" ? "ready" : "needs-fix";
      const build = result?.buildVerification;
      const buildVerification =
        build &&
        ["passed", "failed", "not-configured"].includes(String(build.status))
          ? {
              status: build.status as MissionBuildVerification["status"],
              ...(typeof build.command === "string"
                ? { command: build.command }
                : {}),
              ...(typeof build.durationMs === "number"
                ? { durationMs: build.durationMs }
                : {}),
              ...(typeof build.error === "string"
                ? { error: build.error }
                : {}),
              ...(typeof build.stderr === "string"
                ? { stderr: build.stderr }
                : {}),
              ...(typeof build.stdout === "string"
                ? { stdout: build.stdout }
                : {}),
            }
          : undefined;
      updateMission({ buildVerification, error: fileLoadError, files, status });

      if (files.length > 0) {
        const createdAt = Date.now();
        const generatedArtifacts: Artifact[] = files.map((file, index) => ({
          content: file.content,
          conversationId: sourceMessage.conversationId,
          createdAt: createdAt + index,
          id: `mission-${missionId}-${index}`,
          language: file.language || file.path.split(".").pop() || "text",
          title: file.path,
          type: "code",
        }));
        const artifactIds = generatedArtifacts.map((artifact) => artifact.id);
        setArtifacts((prev) => {
          const updated = [
            ...generatedArtifacts,
            ...prev.filter((artifact) => !artifactIds.includes(artifact.id)),
          ];
          StorageService.saveArtifacts(updated);
          return updated;
        });
        setMessages((prev) => {
          const updated = prev.map((message) =>
            message.id === assistantMessageId
              ? {
                  ...message,
                  artifactIds: [
                    ...new Set([
                      ...(message.artifactIds || []),
                      ...artifactIds,
                    ]),
                  ],
                }
              : message,
          );
          StorageService.saveMessages(updated);
          return updated;
        });
        if (generatedArtifacts[0] && status === "ready") {
          setActiveArtifactId(generatedArtifacts[0].id);
        }
      }
    } catch (error) {
      updateMission({
        error:
          error instanceof Error
            ? error.message
            : "Impossible de lancer la mission.",
        idempotencyKey,
        status: "planned",
      });
    } finally {
      missionStartsRef.current.delete(missionId);
    }
  };

  // Confirm modal helper
  const openConfirmModal = (data: Omit<ConfirmModalData, "isOpen">) => {
    setConfirmModal({ ...data, isOpen: true });
  };

  const closeConfirmModal = () => {
    setConfirmModal(null);
  };

  // Global Keyboard shortcuts (Ctrl+K, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K opens Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      // Escape closes open modals in reverse order
      if (e.key === "Escape") {
        if (confirmModal) {
          closeConfirmModal();
        } else if (isCommandPaletteOpen) {
          setIsCommandPaletteOpen(false);
        } else if (isSettingsOpen) {
          setIsSettingsOpen(false);
        } else if (isSpaceModalOpen) {
          setIsSpaceModalOpen(false);
        } else if (isMobileDrawerOpen) {
          setIsMobileDrawerOpen(false);
        } else if (activeArtifactId) {
          setActiveArtifactId(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    confirmModal,
    isCommandPaletteOpen,
    isSettingsOpen,
    isSpaceModalOpen,
    isMobileDrawerOpen,
    activeArtifactId,
    closeConfirmModal,
  ]);

  return (
    <AppContext.Provider
      value={{
        activeArtifact,
        activeConversation,
        activeMessages,
        activePage,
        activeSpace,
        artifacts,
        closeArtifact,
        closeConfirmModal,
        confirmModal,
        conversations,
        conversationsHasMore,
        isLoadingConversations,
        loadMoreConversations,
        createConversation,
        createSpace,
        deepThink,
        deleteConversation,
        deleteSpace,
        draft,
        exportConversation,
        generationStatus,
        isCommandPaletteOpen,
        isMobileDrawerOpen,
        isSettingsOpen,
        isSpaceModalOpen,
        messages,
        mode,
        openArtifact,
        openConfirmModal,
        renameConversation,
        sendMessage,
        setActiveConversationId,
        setActivePage,
        setActiveSpaceId,
        setDeepThink,
        setDraft,
        setIsCommandPaletteOpen,
        setIsMobileDrawerOpen,
        setIsSettingsOpen,
        setIsSpaceModalOpen,
        setMode,
        setTheme,
        setWebSearch,
        spaces,
        startMission,
        stopGeneration,
        theme,
        toggleArchiveConversation,
        togglePinConversation,
        updateSpace,
        updateArtifactContent,
        webSearch,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
