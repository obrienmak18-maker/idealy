import type {
  Attachment,
  Conversation,
  IntentionMode,
  Message,
} from "../types";
import { getLinkedBackendChatIds, linkBackendChatId } from "./assistantRemote";
import { StorageService } from "./storage";
import { authenticatedFetch } from "./firebase";

type BackendPart = {
  filename?: unknown;
  mediaType?: unknown;
  text?: unknown;
  type?: unknown;
  url?: unknown;
};

type BackendMessage = {
  id?: unknown;
  metadata?: { createdAt?: unknown };
  parts?: BackendPart[];
  role?: unknown;
};

type BackendChat = {
  createdAt?: unknown;
  id?: unknown;
  title?: unknown;
};

function toTimestamp(value: unknown, fallback: number): number {
  if (typeof value !== "string" && typeof value !== "number") return fallback;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : fallback;
}

function mapMessages(payload: unknown, conversationId: string): Message[] {
  if (!payload || typeof payload !== "object") return [];
  const rawMessages = (payload as { messages?: unknown }).messages;
  if (!Array.isArray(rawMessages)) return [];
  return rawMessages.flatMap((value, index) => {
    if (!value || typeof value !== "object") return [];
    const message = value as BackendMessage;
    if (message.role !== "user" && message.role !== "assistant") return [];
    const parts = Array.isArray(message.parts) ? message.parts : [];
    const content = parts
      .filter((part) => part?.type === "text" && typeof part.text === "string")
      .map((part) => part.text as string)
      .join("");
    const attachments: Attachment[] = parts.flatMap((part, partIndex) => {
      if (part?.type !== "file" || typeof part.url !== "string") return [];
      return [
        {
          id: `remote-file-${String(message.id ?? index)}-${partIndex}`,
          name:
            typeof part.filename === "string" ? part.filename : "Fichier joint",
          size: 0,
          type:
            typeof part.mediaType === "string"
              ? part.mediaType
              : "application/octet-stream",
          url: part.url,
        },
      ];
    });
    if (!content && attachments.length === 0) return [];
    return [
      {
        attachments: attachments.length ? attachments : undefined,
        content,
        conversationId,
        createdAt: toTimestamp(message.metadata?.createdAt, Date.now() + index),
        id: `backend-${String(message.id ?? `${conversationId}-${index}`)}`,
        mode: "chat" as IntentionMode,
        role: message.role,
        status: "delivered" as const,
      },
    ];
  });
}

export const BackendHistoryService = {
  async listAndImport(endingBefore?: string): Promise<{
    conversations: Conversation[];
    cursor: string | null;
    hasMore: boolean;
  }> {
    const cursor = endingBefore
      ? `&ending_before=${encodeURIComponent(endingBefore)}`
      : "";
    const response = await authenticatedFetch(`/api/history?limit=50${cursor}`, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    if (response.status === 401 || response.status === 403)
      return { conversations: [], cursor: null, hasMore: false };
    if (!response.ok)
      throw new Error(
        `Chargement de l’historique impossible (${response.status}).`,
      );
    const payload = (await response.json()) as {
      chats?: BackendChat[];
      hasMore?: boolean;
    };
    const remoteChats = Array.isArray(payload.chats) ? payload.chats : [];
    const linked = getLinkedBackendChatIds();
    const conversationByRemoteId = new Map(
      Object.entries(linked).map(([localId, remoteId]) => [remoteId, localId]),
    );
    const existing = StorageService.loadConversations();
    const knownLocalIds = new Set(
      existing.map((conversation) => conversation.id),
    );
    const additions: Conversation[] = [];

    for (const chat of remoteChats) {
      if (typeof chat.id !== "string" || !chat.id) continue;
      if (conversationByRemoteId.has(chat.id)) continue;
      const localId = `backend-chat-${chat.id}`;
      if (knownLocalIds.has(localId)) {
        linkBackendChatId(localId, chat.id);
        conversationByRemoteId.set(chat.id, localId);
        continue;
      }
      const createdAt = toTimestamp(chat.createdAt, Date.now());
      const title =
        typeof chat.title === "string" && chat.title.trim()
          ? chat.title
          : "Nouvelle conversation";
      additions.push({
        createdAt,
        draft: "",
        id: localId,
        isArchived: false,
        isPinned: false,
        selectedMode: "chat",
        spaceId: "space-general",
        title,
        updatedAt: createdAt,
      });
      knownLocalIds.add(localId);
      linkBackendChatId(localId, chat.id);
      conversationByRemoteId.set(chat.id, localId);
    }

    if (additions.length)
      StorageService.saveConversations([...additions, ...existing]);
    const lastChatId = remoteChats.at(-1)?.id;
    return {
      conversations: additions,
      cursor: typeof lastChatId === "string" ? lastChatId : null,
      hasMore: payload.hasMore === true && typeof lastChatId === "string",
    };
  },

  async loadMessages(localConversationId: string): Promise<Message[] | null> {
    const backendChatId = getLinkedBackendChatIds()[localConversationId];
    if (!backendChatId) return null;
    const response = await authenticatedFetch(
      `/api/messages?chatId=${encodeURIComponent(backendChatId)}`,
      {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      },
    );
    if (response.status === 401 || response.status === 403) return null;
    if (!response.ok)
      throw new Error(
        `Chargement de la conversation impossible (${response.status}).`,
      );
    return mapMessages(await response.json(), localConversationId);
  },
};
