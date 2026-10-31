import type { Artifact, Conversation, Message, Space, Theme } from "../types";

const STORAGE_KEYS = {
  ACTIVE_CONVERSATION: "idealy_active_conversation_v1",
  ACTIVE_SPACE: "idealy_active_space_v1",
  ARTIFACTS: "idealy_artifacts_v1",
  CONVERSATIONS: "idealy_conversations_v1",
  MESSAGES: "idealy_messages_v1",
  SPACES: "idealy_spaces_v1",
  THEME: "idealy_theme_v1",
};

// In-memory fallback if localStorage is unavailable
const memoryStore: Record<string, string> = {};

function safeGet(key: string): string | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return memoryStore[key] || null;
  } catch {
    return memoryStore[key] || null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
    memoryStore[key] = value;
  } catch {
    memoryStore[key] = value;
  }
}

// Initial seed data
const DEFAULT_SPACE: Space = {
  createdAt: Date.now() - 3_600_000,
  description:
    "Espace par défaut pour vos réflexions, analyses et productions.",
  id: "space-general",
  instructions:
    "Maintenir un ton concis, structuré et orienté livrable. Mettre en avant le code et les données.",
  name: "Espace Principal",
};

const DEFAULT_CONVERSATION: Conversation = {
  createdAt: Date.now() - 3_600_000,
  draft: "",
  id: "conv-welcome",
  isArchived: false,
  isPinned: false,
  selectedMode: "chat",
  spaceId: "space-general",
  title: "Nouvelle conversation",
  updatedAt: Date.now() - 3_600_000,
};

const DEFAULT_ARTIFACTS: Artifact[] = [];
const DEFAULT_MESSAGES: Message[] = [];

function migrateDemoContent(): void {
  try {
    const messages = JSON.parse(
      safeGet(STORAGE_KEYS.MESSAGES) || "[]",
    ) as Message[];
    const conversations = JSON.parse(
      safeGet(STORAGE_KEYS.CONVERSATIONS) || "[]",
    ) as Conversation[];
    const artifacts = JSON.parse(
      safeGet(STORAGE_KEYS.ARTIFACTS) || "[]",
    ) as Artifact[];
    const cleanMessages = messages.filter(
      (message) => !["msg-1", "msg-2"].includes(message.id),
    );
    const cleanArtifacts = artifacts.filter(
      (artifact) => artifact.id !== "art-charter",
    );
    const cleanConversations = conversations.map((conversation) =>
      conversation.id === "conv-welcome"
        ? { ...conversation, isPinned: false, title: "Nouvelle conversation" }
        : conversation,
    );
    if (cleanMessages.length !== messages.length)
      safeSet(STORAGE_KEYS.MESSAGES, JSON.stringify(cleanMessages));
    if (cleanArtifacts.length !== artifacts.length)
      safeSet(STORAGE_KEYS.ARTIFACTS, JSON.stringify(cleanArtifacts));
    if (JSON.stringify(cleanConversations) !== JSON.stringify(conversations))
      safeSet(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(cleanConversations));
  } catch {
    // Ignore corrupt local cache; normal loaders will initialize a clean state.
  }
}

migrateDemoContent();

export const StorageService = {
  loadActiveConversationId(): string {
    return safeGet(STORAGE_KEYS.ACTIVE_CONVERSATION) || "conv-welcome";
  },

  loadActiveSpaceId(): string {
    return safeGet(STORAGE_KEYS.ACTIVE_SPACE) || "space-general";
  },

  loadArtifacts(): Artifact[] {
    const raw = safeGet(STORAGE_KEYS.ARTIFACTS);
    if (!raw) {
      this.saveArtifacts(DEFAULT_ARTIFACTS);
      return DEFAULT_ARTIFACTS;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : DEFAULT_ARTIFACTS;
    } catch {
      return DEFAULT_ARTIFACTS;
    }
  },

  loadConversations(): Conversation[] {
    const raw = safeGet(STORAGE_KEYS.CONVERSATIONS);
    if (!raw) {
      this.saveConversations([DEFAULT_CONVERSATION]);
      return [DEFAULT_CONVERSATION];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0
        ? parsed
        : [DEFAULT_CONVERSATION];
    } catch {
      return [DEFAULT_CONVERSATION];
    }
  },

  loadMessages(): Message[] {
    const raw = safeGet(STORAGE_KEYS.MESSAGES);
    if (!raw) {
      this.saveMessages(DEFAULT_MESSAGES);
      return DEFAULT_MESSAGES;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : DEFAULT_MESSAGES;
    } catch {
      return DEFAULT_MESSAGES;
    }
  },
  loadSpaces(): Space[] {
    const raw = safeGet(STORAGE_KEYS.SPACES);
    if (!raw) {
      this.saveSpaces([DEFAULT_SPACE]);
      return [DEFAULT_SPACE];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0
        ? parsed
        : [DEFAULT_SPACE];
    } catch {
      return [DEFAULT_SPACE];
    }
  },

  loadTheme(): Theme {
    const raw = safeGet(STORAGE_KEYS.THEME) as Theme;
    return raw === "light" || raw === "dark" || raw === "system"
      ? raw
      : "system";
  },

  saveActiveConversationId(conversationId: string): void {
    safeSet(STORAGE_KEYS.ACTIVE_CONVERSATION, conversationId);
  },

  saveActiveSpaceId(spaceId: string): void {
    safeSet(STORAGE_KEYS.ACTIVE_SPACE, spaceId);
  },

  saveArtifacts(artifacts: Artifact[]): void {
    safeSet(STORAGE_KEYS.ARTIFACTS, JSON.stringify(artifacts));
  },

  saveConversations(conversations: Conversation[]): void {
    safeSet(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
  },

  saveMessages(messages: Message[]): void {
    safeSet(
      STORAGE_KEYS.MESSAGES,
      JSON.stringify(
        messages.map((message) => ({
          ...message,
          attachments: message.attachments?.map(
            ({ file: _file, ...attachment }) => attachment,
          ),
        })),
      ),
    );
  },

  saveSpaces(spaces: Space[]): void {
    safeSet(STORAGE_KEYS.SPACES, JSON.stringify(spaces));
  },

  saveTheme(theme: Theme): void {
    safeSet(STORAGE_KEYS.THEME, theme);
  },
};
