import "server-only";

import type { ArtifactKind } from "@/components/chat/artifact";
import type { VisibilityType } from "@/components/chat/visibility-selector";
import { ChatbotError } from "../errors";
import { generateUUID } from "../utils";
import type {
  Chat,
  DBMessage,
  Document,
  Suggestion,
  Stream,
  User,
  Vote,
} from "./schema";
import { generateHashedPassword } from "./utils";

type JsonObject = Record<string, unknown>;

type SupabaseConfig = {
  url: string;
  serviceRoleKey: string;
};

function ensureDatabaseConfigured(): SupabaseConfig {
  const url =
    process.env.SUPABASE_URL?.trim().replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new ChatbotError(
      "bad_request:database",
      "Supabase server persistence is not configured."
    );
  }

  return { serviceRoleKey, url };
}

async function requestSupabase<T>(
  table: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    query?: Record<string, string>;
    body?: unknown;
  } = {}
): Promise<T> {
  const config = ensureDatabaseConfigured();
  const url = new URL(`${config.url}/rest/v1/${encodeURIComponent(table)}`);

  for (const [key, value] of Object.entries(options.query ?? {})) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      apikey: config.serviceRoleKey,
      Prefer: "return=representation",
    },
    body:
      options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new ChatbotError(
      "bad_request:database",
      `Supabase persistence request failed (${response.status}): ${detail.slice(0, 400)}`
    );
  }

  if (response.status === 204) {
    return [] as T;
  }

  return (await response.json()) as T;
}

function mapUser(row: JsonObject): User {
  return {
    createdAt: new Date(String(row.createdAt)),
    email: String(row.email),
    emailVerified: Boolean(row.emailVerified),
    id: String(row.id),
    image: typeof row.image === "string" ? row.image : null,
    isAnonymous: Boolean(row.isAnonymous),
    name: typeof row.name === "string" ? row.name : null,
    password: typeof row.password === "string" ? row.password : null,
    supabaseUserId:
      typeof row.supabaseUserId === "string" ? row.supabaseUserId : null,
    updatedAt: new Date(String(row.updatedAt)),
  };
}

function mapChat(row: JsonObject): Chat {
  return {
    createdAt: new Date(String(row.createdAt)),
    id: String(row.id),
    title: String(row.title),
    userId: String(row.userId),
    visibility:
      row.visibility === "public" ? "public" : "private",
  };
}

function mapMessage(row: JsonObject): DBMessage {
  return {
    attachments: (row.attachments ?? []) as DBMessage["attachments"],
    chatId: String(row.chatId),
    createdAt: new Date(String(row.createdAt)),
    id: String(row.id),
    parts: (row.parts ?? []) as DBMessage["parts"],
    role: String(row.role),
  };
}

function mapVote(row: JsonObject): Vote {
  return {
    chatId: String(row.chatId),
    isUpvoted: Boolean(row.isUpvoted),
    messageId: String(row.messageId),
  };
}

function mapDocument(row: JsonObject): Document {
  return {
    content: typeof row.content === "string" ? row.content : null,
    createdAt: new Date(String(row.createdAt)),
    id: String(row.id),
    kind:
      row.text === "code" ||
      row.text === "image" ||
      row.text === "sheet"
        ? row.text
        : "text",
    title: String(row.title),
    userId: String(row.userId),
  };
}

function mapSuggestion(row: JsonObject): Suggestion {
  return {
    createdAt: new Date(String(row.createdAt)),
    description:
      typeof row.description === "string" ? row.description : null,
    documentCreatedAt: new Date(String(row.documentCreatedAt)),
    documentId: String(row.documentId),
    id: String(row.id),
    isResolved: Boolean(row.isResolved),
    originalText: String(row.originalText),
    suggestedText: String(row.suggestedText),
    userId: String(row.userId),
  };
}

function mapStream(row: JsonObject): Stream {
  return {
    chatId: String(row.chatId),
    createdAt: new Date(String(row.createdAt)),
    id: String(row.id),
  };
}

function csvList(values: readonly string[]) {
  return `(${values.join(",")})`;
}

export async function getUser(email: string): Promise<User[]> {
  const rows = await requestSupabase<JsonObject[]>("User", {
    query: {
      select: "*",
      email: `eq.${email.toLowerCase()}`,
      order: "createdAt.asc",
    },
  });
  return rows.map(mapUser);
}

export async function getUserBySupabaseUserId(
  supabaseUserId: string
): Promise<User | null> {
  const rows = await requestSupabase<JsonObject[]>("User", {
    query: {
      select: "*",
      supabaseUserId: `eq.${supabaseUserId}`,
      limit: "1",
    },
  });
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function createUser(
  email: string,
  password: string
): Promise<User[]> {
  const hashedPassword = generateHashedPassword(password);
  const rows = await requestSupabase<JsonObject[]>("User", {
    method: "POST",
    body: {
      email: email.toLowerCase(),
      password: hashedPassword,
      emailVerified: false,
      isAnonymous: false,
    },
  });

  if (!rows[0]) {
    throw new ChatbotError(
      "bad_request:database",
      "User creation returned no row."
    );
  }
  return rows.map(mapUser);
}

export async function linkUserToSupabaseUser({
  localUserId,
  supabaseUserId,
}: {
  localUserId: string;
  supabaseUserId: string;
}) {
  const rows = await requestSupabase<JsonObject[]>("User", {
    method: "PATCH",
    query: {
      id: `eq.${localUserId}`,
    },
    body: {
      supabaseUserId,
      updatedAt: new Date().toISOString(),
    },
  });

  if (!rows[0]) {
    throw new ChatbotError("not_found:database", "User not found.");
  }

  return {
    id: String(rows[0].id),
    supabaseUserId:
      typeof rows[0].supabaseUserId === "string"
        ? rows[0].supabaseUserId
        : null,
  };
}

export async function createGuestUser(): Promise<User[]> {
  const email = `guest-${Date.now()}@${"idealy.local"}`;
  const password = generateHashedPassword(generateUUID());
  const rows = await requestSupabase<JsonObject[]>("User", {
    method: "POST",
    body: {
      email,
      password,
      emailVerified: false,
      isAnonymous: true,
    },
  });

  if (!rows[0]) {
    throw new ChatbotError(
      "bad_request:database",
      "Guest user creation returned no row."
    );
  }

  return rows.map(mapUser);
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  const rows = await requestSupabase<JsonObject[]>("Chat", {
    method: "POST",
    body: {
      createdAt: new Date().toISOString(),
      id,
      title,
      userId,
      visibility,
    },
  });
  if (!rows[0]) {
    throw new ChatbotError("bad_request:database", "Chat creation returned no row.");
  }
  return mapChat(rows[0]);
}

export async function deleteChatById({ id }: { id: string }) {
  await requestSupabase("Vote_v2", {
    method: "DELETE",
    query: { chatId: `eq.${id}` },
  });
  await requestSupabase("Message_v2", {
    method: "DELETE",
    query: { chatId: `eq.${id}` },
  });
  await requestSupabase("Stream", {
    method: "DELETE",
    query: { chatId: `eq.${id}` },
  });

  const rows = await requestSupabase<JsonObject[]>("Chat", {
    method: "DELETE",
    query: { id: `eq.${id}` },
  });
  return rows[0] ? mapChat(rows[0]) : null;
}

export async function deleteAllChatsByUserId({ userId }: { userId: string }) {
  const chats = await requestSupabase<JsonObject[]>("Chat", {
    query: {
      select: "id",
      userId: `eq.${userId}`,
    },
  });

  const chatIds = chats
    .map((row) => String(row.id))
    .filter(Boolean);

  if (chatIds.length === 0) {
    return { deletedCount: 0 };
  }

  const inFilter = csvList(chatIds);
  await requestSupabase("Vote_v2", {
    method: "DELETE",
    query: { chatId: `in.${inFilter}` },
  });
  await requestSupabase("Message_v2", {
    method: "DELETE",
    query: { chatId: `in.${inFilter}` },
  });
  await requestSupabase("Stream", {
    method: "DELETE",
    query: { chatId: `in.${inFilter}` },
  });

  const deleted = await requestSupabase<JsonObject[]>("Chat", {
    method: "DELETE",
    query: { userId: `eq.${userId}` },
  });

  return { deletedCount: deleted.length };
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  const extendedLimit = limit + 1;

  if (startingAfter) {
    const selectedRows = await requestSupabase<JsonObject[]>("Chat", {
      query: {
        select: "*",
        id: `eq.${startingAfter}`,
        userId: `eq.${id}`,
        limit: "1",
      },
    });
    const selected = selectedRows[0] ? mapChat(selectedRows[0]) : null;
    if (!selected) return { chats: [], hasMore: false };

    const rows = await requestSupabase<JsonObject[]>("Chat", {
      query: {
        select: "*",
        userId: `eq.${id}`,
        createdAt: `gt.${selected.createdAt.toISOString()}`,
        order: "createdAt.desc",
        limit: String(extendedLimit),
      },
    });
    const chats = rows.map(mapChat);
    const hasMore = chats.length > limit;
    return {
      chats: hasMore ? chats.slice(0, limit) : chats,
      hasMore,
    };
  }

  if (endingBefore) {
    const selectedRows = await requestSupabase<JsonObject[]>("Chat", {
      query: {
        select: "*",
        id: `eq.${endingBefore}`,
        userId: `eq.${id}`,
        limit: "1",
      },
    });
    const selected = selectedRows[0] ? mapChat(selectedRows[0]) : null;
    if (!selected) return { chats: [], hasMore: false };

    const rows = await requestSupabase<JsonObject[]>("Chat", {
      query: {
        select: "*",
        userId: `eq.${id}`,
        createdAt: `lt.${selected.createdAt.toISOString()}`,
        order: "createdAt.desc",
        limit: String(extendedLimit),
      },
    });
    const chats = rows.map(mapChat);
    const hasMore = chats.length > limit;
    return {
      chats: hasMore ? chats.slice(0, limit) : chats,
      hasMore,
    };
  }

  const rows = await requestSupabase<JsonObject[]>("Chat", {
    query: {
      select: "*",
      userId: `eq.${id}`,
      order: "createdAt.desc",
      limit: String(extendedLimit),
    },
  });
  const chats = rows.map(mapChat);
  const hasMore = chats.length > limit;
  return {
    chats: hasMore ? chats.slice(0, limit) : chats,
    hasMore,
  };
}

export async function getChatById({ id }: { id: string }) {
  const rows = await requestSupabase<JsonObject[]>("Chat", {
    query: {
      select: "*",
      id: `eq.${id}`,
      limit: "1",
    },
  });
  return rows[0] ? mapChat(rows[0]) : null;
}

export async function saveMessages({ messages }: { messages: DBMessage[] }) {
  if (!messages.length) return [];
  const rows = await requestSupabase<JsonObject[]>("Message_v2", {
    method: "POST",
    body: messages.map((message) => ({
      attachments: message.attachments,
      chatId: message.chatId,
      createdAt: message.createdAt.toISOString(),
      id: message.id,
      parts: message.parts,
      role: message.role,
    })),
  });
  return rows.map(mapMessage);
}

export async function updateMessage({
  id,
  parts,
}: {
  id: string;
  parts: DBMessage["parts"];
}) {
  const rows = await requestSupabase<JsonObject[]>("Message_v2", {
    method: "PATCH",
    query: { id: `eq.${id}` },
    body: { parts },
  });
  return rows.map(mapMessage);
}

export async function getMessagesByChatId({ id }: { id: string }) {
  const rows = await requestSupabase<JsonObject[]>("Message_v2", {
    query: {
      select: "*",
      chatId: `eq.${id}`,
      order: "createdAt.asc",
    },
  });
  return rows.map(mapMessage);
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  const existingRows = await requestSupabase<JsonObject[]>("Vote_v2", {
    query: {
      select: "*",
      chatId: `eq.${chatId}`,
      messageId: `eq.${messageId}`,
      limit: "1",
    },
  });

  const values = {
    chatId,
    isUpvoted: type === "up",
    messageId,
  };

  if (existingRows[0]) {
    const rows = await requestSupabase<JsonObject[]>("Vote_v2", {
      method: "PATCH",
      query: {
        chatId: `eq.${chatId}`,
        messageId: `eq.${messageId}`,
      },
      body: { isUpvoted: values.isUpvoted },
    });
    return rows.map(mapVote);
  }

  const rows = await requestSupabase<JsonObject[]>("Vote_v2", {
    method: "POST",
    body: values,
  });
  return rows.map(mapVote);
}

export async function getVotesByChatId({ id }: { id: string }) {
  const rows = await requestSupabase<JsonObject[]>("Vote_v2", {
    query: {
      select: "*",
      chatId: `eq.${id}`,
    },
  });
  return rows.map(mapVote);
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  const rows = await requestSupabase<JsonObject[]>("Document", {
    method: "POST",
    body: {
      content,
      createdAt: new Date().toISOString(),
      id,
      text: kind,
      title,
      userId,
    },
  });
  return rows.map(mapDocument);
}

export async function updateDocumentContent({
  id,
  content,
}: {
  id: string;
  content: string;
}) {
  const latestRows = await requestSupabase<JsonObject[]>("Document", {
    query: {
      select: "*",
      id: `eq.${id}`,
      order: "createdAt.desc",
      limit: "1",
    },
  });

  const latest = latestRows[0] ? mapDocument(latestRows[0]) : null;
  if (!latest) {
    throw new ChatbotError("not_found:database", "Document not found.");
  }

  const rows = await requestSupabase<JsonObject[]>("Document", {
    method: "PATCH",
    query: {
      id: `eq.${id}`,
      createdAt: `eq.${latest.createdAt.toISOString()}`,
    },
    body: { content },
  });
  return rows.map(mapDocument);
}

export async function getDocumentsById({ id }: { id: string }) {
  const rows = await requestSupabase<JsonObject[]>("Document", {
    query: {
      select: "*",
      id: `eq.${id}`,
      order: "createdAt.asc",
    },
  });
  return rows.map(mapDocument);
}

export async function getDocumentById({ id }: { id: string }) {
  const rows = await requestSupabase<JsonObject[]>("Document", {
    query: {
      select: "*",
      id: `eq.${id}`,
      order: "createdAt.desc",
      limit: "1",
    },
  });
  return rows[0] ? mapDocument(rows[0]) : undefined;
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  await requestSupabase("Suggestion", {
    method: "DELETE",
    query: {
      documentId: `eq.${id}`,
      documentCreatedAt: `gt.${timestamp.toISOString()}`,
    },
  });

  const rows = await requestSupabase<JsonObject[]>("Document", {
    method: "DELETE",
    query: {
      id: `eq.${id}`,
      createdAt: `gt.${timestamp.toISOString()}`,
    },
  });
  return rows.map(mapDocument);
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  if (!suggestions.length) return [];
  const rows = await requestSupabase<JsonObject[]>("Suggestion", {
    method: "POST",
    body: suggestions.map((item) => ({
      createdAt: item.createdAt.toISOString(),
      description: item.description,
      documentCreatedAt: item.documentCreatedAt.toISOString(),
      documentId: item.documentId,
      id: item.id,
      isResolved: item.isResolved,
      originalText: item.originalText,
      suggestedText: item.suggestedText,
      userId: item.userId,
    })),
  });
  return rows.map(mapSuggestion);
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  const rows = await requestSupabase<JsonObject[]>("Suggestion", {
    query: {
      select: "*",
      documentId: `eq.${documentId}`,
    },
  });
  return rows.map(mapSuggestion);
}

export async function getMessageById({ id }: { id: string }) {
  const rows = await requestSupabase<JsonObject[]>("Message_v2", {
    query: {
      select: "*",
      id: `eq.${id}`,
    },
  });
  return rows.map(mapMessage);
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  const messageRows = await requestSupabase<JsonObject[]>("Message_v2", {
    query: {
      select: "id",
      chatId: `eq.${chatId}`,
      createdAt: `gte.${timestamp.toISOString()}`,
    },
  });
  const messageIds = messageRows.map((row) => String(row.id));
  if (messageIds.length === 0) return [];

  await requestSupabase("Vote_v2", {
    method: "DELETE",
    query: { messageId: `in.${csvList(messageIds)}` },
  });

  const rows = await requestSupabase<JsonObject[]>("Message_v2", {
    method: "DELETE",
    query: {
      chatId: `eq.${chatId}`,
      createdAt: `gte.${timestamp.toISOString()}`,
    },
  });
  return rows.map(mapMessage);
}

export async function updateChatVisibilityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  const rows = await requestSupabase<JsonObject[]>("Chat", {
    method: "PATCH",
    query: { id: `eq.${chatId}` },
    body: { visibility },
  });
  return rows.map(mapChat);
}

export async function updateChatTitleById({
  chatId,
  title,
}: {
  chatId: string;
  title: string;
}) {
  try {
    const rows = await requestSupabase<JsonObject[]>("Chat", {
      method: "PATCH",
      query: { id: `eq.${chatId}` },
      body: { title },
    });
    return rows.map(mapChat);
  } catch {
    // Best effort title update.
    return [];
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  const cutoff = new Date(
    Date.now() - differenceInHours * 60 * 60 * 1000
  ).toISOString();

  const chats = await requestSupabase<JsonObject[]>("Chat", {
    query: {
      select: "id",
      userId: `eq.${id}`,
    },
  });
  const chatIds = chats.map((row) => String(row.id));
  if (chatIds.length === 0) return 0;

  const messages = await requestSupabase<JsonObject[]>("Message_v2", {
    query: {
      select: "id",
      chatId: `in.${csvList(chatIds)}`,
      role: "eq.user",
      createdAt: `gte.${cutoff}`,
      limit: "20000",
    },
  });
  return messages.length;
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  await requestSupabase("Stream", {
    method: "POST",
    body: {
      chatId,
      createdAt: new Date().toISOString(),
      id: streamId,
    },
  });
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  const rows = await requestSupabase<JsonObject[]>("Stream", {
    query: {
      select: "*",
      chatId: `eq.${chatId}`,
      order: "createdAt.asc",
    },
  });
  return rows.map(mapStream).map(({ id }) => id);
}
