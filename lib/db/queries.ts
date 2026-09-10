import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  type SQL,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { ArtifactKind } from "@/components/chat/artifact";
import type { VisibilityType } from "@/components/chat/visibility-selector";
import { ChatbotError } from "../errors";
import { generateUUID } from "../utils";
import {
  type Chat,
  chat,
  type DBMessage,
  document,
  message,
  type Suggestion,
  stream,
  suggestion,
  type User,
  user,
  vote,
} from "./schema";
import { generateHashedPassword } from "./utils";

const client = postgres(process.env.POSTGRES_URL ?? "");
const db = drizzle(client);

// In-memory fallback cache for development/resilience when Postgres is offline
const fallbackUsers = (
  globalThis as unknown as { __idealy_fallback_users?: Map<string, User> }
).__idealy_fallback_users ??= new Map<string, User>();

const fallbackChats = (
  globalThis as unknown as { __idealy_fallback_chats?: Map<string, Chat> }
).__idealy_fallback_chats ??= new Map<string, Chat>();

const fallbackMessages = (
  globalThis as unknown as { __idealy_fallback_messages?: Map<string, DBMessage[]> }
).__idealy_fallback_messages ??= new Map<string, DBMessage[]>();

const fallbackStreams = (
  globalThis as unknown as { __idealy_fallback_streams?: Map<string, string[]> }
).__idealy_fallback_streams ??= new Map<string, string[]>();

export async function getUser(email: string): Promise<User[]> {
  try {
    if (!process.env.POSTGRES_URL) {
      const cached = fallbackUsers.get(email.toLowerCase());
      return cached ? [cached] : [];
    }
    return await db.select().from(user).where(eq(user.email, email));
  } catch {
    const cached = fallbackUsers.get(email.toLowerCase());
    return cached ? [cached] : [];
  }
}

export async function getUserBySupabaseUserId(
  supabaseUserId: string
): Promise<User | null> {
  try {
    if (!process.env.POSTGRES_URL) {
      for (const u of fallbackUsers.values()) {
        if (u.supabaseUserId === supabaseUserId) return u;
      }
      return null;
    }
    const [selectedUser] = await db
      .select()
      .from(user)
      .where(eq(user.supabaseUserId, supabaseUserId))
      .limit(1);
    return selectedUser ?? null;
  } catch {
    for (const u of fallbackUsers.values()) {
      if (u.supabaseUserId === supabaseUserId) return u;
    }
    return null;
  }
}

export async function createUser(email: string, password: string): Promise<User[]> {
  const hashedPassword = generateHashedPassword(password);
  const normalizedEmail = email.toLowerCase();
  const newUser: User = {
    id: generateUUID(),
    email: normalizedEmail,
    name: null,
    password: hashedPassword,
    image: null,
    isAnonymous: false,
    emailVerified: false,
    supabaseUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  fallbackUsers.set(normalizedEmail, newUser);

  try {
    if (process.env.POSTGRES_URL) {
      await db.insert(user).values({ email: normalizedEmail, password: hashedPassword });
    }
    return [newUser];
  } catch {
    return [newUser];
  }
}

export async function linkUserToSupabaseUser({
  localUserId,
  supabaseUserId,
}: {
  localUserId: string;
  supabaseUserId: string;
}) {
  for (const u of fallbackUsers.values()) {
    if (u.id === localUserId) {
      u.supabaseUserId = supabaseUserId;
      u.updatedAt = new Date();
    }
  }

  try {
    if (process.env.POSTGRES_URL) {
      const [linkedUser] = await db
        .update(user)
        .set({ supabaseUserId, updatedAt: new Date() })
        .where(eq(user.id, localUserId))
        .returning({ id: user.id, supabaseUserId: user.supabaseUserId });
      return linkedUser;
    }
    return { id: localUserId, supabaseUserId };
  } catch {
    return { id: localUserId, supabaseUserId };
  }
}

export async function createGuestUser(): Promise<User[]> {
  const email = `guest-${Date.now()}@idealy.local`;
  const password = generateHashedPassword(generateUUID());
  const guestUser: User = {
    id: generateUUID(),
    email,
    name: "Invité",
    password,
    image: null,
    isAnonymous: true,
    emailVerified: false,
    supabaseUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  fallbackUsers.set(email, guestUser);

  try {
    if (process.env.POSTGRES_URL) {
      const [created] = await db.insert(user).values({ email, password }).returning();
      return created ? [created] : [guestUser];
    }
    return [guestUser];
  } catch {
    return [guestUser];
  }
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
  const newChat: Chat = {
    createdAt: new Date(),
    id,
    title,
    userId,
    visibility,
  };
  fallbackChats.set(id, newChat);

  try {
    if (process.env.POSTGRES_URL) {
      await db.insert(chat).values(newChat);
    }
    return newChat;
  } catch {
    return newChat;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  const deleted = fallbackChats.get(id);
  fallbackChats.delete(id);
  fallbackMessages.delete(id);
  fallbackStreams.delete(id);

  try {
    if (process.env.POSTGRES_URL) {
      await db.delete(vote).where(eq(vote.chatId, id));
      await db.delete(message).where(eq(message.chatId, id));
      await db.delete(stream).where(eq(stream.chatId, id));

      const [chatsDeleted] = await db
        .delete(chat)
        .where(eq(chat.id, id))
        .returning();
      return chatsDeleted ?? deleted;
    }
    return deleted;
  } catch {
    return deleted;
  }
}

export async function deleteAllChatsByUserId({ userId }: { userId: string }) {
  let deletedCount = 0;
  for (const [chatId, c] of Array.from(fallbackChats.entries())) {
    if (c.userId === userId) {
      fallbackChats.delete(chatId);
      fallbackMessages.delete(chatId);
      fallbackStreams.delete(chatId);
      deletedCount++;
    }
  }

  try {
    if (process.env.POSTGRES_URL) {
      const userChats = await db
        .select({ id: chat.id })
        .from(chat)
        .where(eq(chat.userId, userId));

      if (userChats.length === 0) {
        return { deletedCount };
      }

      const chatIds = userChats.map((c) => c.id);

      await db.delete(vote).where(inArray(vote.chatId, chatIds));
      await db.delete(message).where(inArray(message.chatId, chatIds));
      await db.delete(stream).where(inArray(stream.chatId, chatIds));

      const deletedChats = await db
        .delete(chat)
        .where(eq(chat.userId, userId))
        .returning();

      return { deletedCount: deletedChats.length };
    }
    return { deletedCount };
  } catch {
    return { deletedCount };
  }
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
  const getFallbackResult = () => {
    let list = Array.from(fallbackChats.values())
      .filter((c) => c.userId === id)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    if (startingAfter) {
      const idx = list.findIndex((c) => c.id === startingAfter);
      if (idx !== -1) {
        list = list.filter(
          (c) => new Date(c.createdAt) > new Date(list[idx].createdAt)
        );
      }
    } else if (endingBefore) {
      const idx = list.findIndex((c) => c.id === endingBefore);
      if (idx !== -1) {
        list = list.filter(
          (c) => new Date(c.createdAt) < new Date(list[idx].createdAt)
        );
      }
    }

    const hasMore = list.length > limit;
    return {
      chats: hasMore ? list.slice(0, limit) : list,
      hasMore,
    };
  };

  try {
    if (!process.env.POSTGRES_URL) {
      return getFallbackResult();
    }

    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<unknown>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id)
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Chat[] = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        return getFallbackResult();
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        return getFallbackResult();
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch {
    return getFallbackResult();
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    if (!process.env.POSTGRES_URL) {
      return fallbackChats.get(id) ?? null;
    }
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat ?? fallbackChats.get(id) ?? null;
  } catch {
    return fallbackChats.get(id) ?? null;
  }
}

export async function saveMessages({ messages }: { messages: DBMessage[] }) {
  for (const m of messages) {
    const list = fallbackMessages.get(m.chatId) ?? [];
    list.push(m);
    fallbackMessages.set(m.chatId, list);
  }

  try {
    if (process.env.POSTGRES_URL) {
      return await db.insert(message).values(messages);
    }
    return messages;
  } catch {
    return messages;
  }
}

export async function updateMessage({
  id,
  parts,
}: {
  id: string;
  parts: DBMessage["parts"];
}) {
  for (const list of fallbackMessages.values()) {
    const found = list.find((m) => m.id === id);
    if (found) {
      found.parts = parts;
      break;
    }
  }

  try {
    if (process.env.POSTGRES_URL) {
      return await db.update(message).set({ parts }).where(eq(message.id, id));
    }
  } catch {
    // Non-blocking
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  const getFallbackMsgs = () =>
    (fallbackMessages.get(id) ?? []).slice().sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

  try {
    if (!process.env.POSTGRES_URL) {
      return getFallbackMsgs();
    }
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch {
    return getFallbackMsgs();
  }
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
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === "up" })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      isUpvoted: type === "up",
      messageId,
    });
  } catch (error) {
    throw new ChatbotError("bad_request:database", {
      cause: error,
    });
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    if (!process.env.POSTGRES_URL) {
      return [];
    }
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch {
    return [];
  }
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
  try {
    return await db
      .insert(document)
      .values({
        content,
        createdAt: new Date(),
        id,
        kind,
        title,
        userId,
      })
      .returning();
  } catch (error) {
    throw new ChatbotError("bad_request:database", {
      cause: error,
    });
  }
}

export async function updateDocumentContent({
  id,
  content,
}: {
  id: string;
  content: string;
}) {
  try {
    const docs = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt))
      .limit(1);

    const [latest] = docs;
    if (!latest) {
      throw new ChatbotError("not_found:database", "Document not found");
    }

    return await db
      .update(document)
      .set({ content })
      .where(and(eq(document.id, id), eq(document.createdAt, latest.createdAt)))
      .returning();
  } catch (error) {
    if (error instanceof ChatbotError) {
      throw error;
    }
    throw new ChatbotError("bad_request:database", {
      cause: error,
    });
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    throw new ChatbotError("bad_request:database", { cause: error });
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    throw new ChatbotError("bad_request:database", { cause: error });
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp)
        )
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (error) {
    throw new ChatbotError("bad_request:database", { cause: error });
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    throw new ChatbotError("bad_request:database", { cause: error });
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(eq(suggestion.documentId, documentId));
  } catch (error) {
    throw new ChatbotError("bad_request:database", { cause: error });
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    if (!process.env.POSTGRES_URL) {
      for (const list of fallbackMessages.values()) {
        const found = list.find((m) => m.id === id);
        if (found) return [found];
      }
      return [];
    }
    return await db.select().from(message).where(eq(message.id, id));
  } catch {
    for (const list of fallbackMessages.values()) {
      const found = list.find((m) => m.id === id);
      if (found) return [found];
    }
    return [];
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  const fallbackList = fallbackMessages.get(chatId);
  if (fallbackList) {
    fallbackMessages.set(
      chatId,
      fallbackList.filter((m) => new Date(m.createdAt) < timestamp)
    );
  }

  try {
    if (!process.env.POSTGRES_URL) {
      return [];
    }

    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp))
      );

    const messageIds = messagesToDelete.map((m) => m.id);

    if (messageIds.length > 0) {
      await db.delete(vote).where(inArray(vote.messageId, messageIds));
      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), gte(message.createdAt, timestamp))
        )
        .returning();
    }
    return [];
  } catch {
    return [];
  }
}

export async function updateChatVisibilityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    throw new ChatbotError("bad_request:database", { cause: error });
  }
}

export async function updateChatTitleById({
  chatId,
  title,
}: {
  chatId: string;
  title: string;
}) {
  try {
    return await db.update(chat).set({ title }).where(eq(chat.id, chatId));
  } catch {
    // Best effort title update.
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  const fallbackCount = () => {
    const cutoffTime = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000
    );
    const userChatIds = new Set(
      Array.from(fallbackChats.values())
        .filter((c) => c.userId === id)
        .map((c) => c.id)
    );
    let count = 0;
    for (const [chatId, msgs] of fallbackMessages.entries()) {
      if (userChatIds.has(chatId)) {
        for (const m of msgs) {
          if (m.role === "user" && new Date(m.createdAt) >= cutoffTime) {
            count++;
          }
        }
      }
    }
    return count;
  };

  try {
    if (!process.env.POSTGRES_URL) {
      return fallbackCount();
    }

    const cutoffTime = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, cutoffTime),
          eq(message.role, "user")
        )
      )
      .execute();

    return stats?.count ?? fallbackCount();
  } catch {
    return fallbackCount();
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  const list = fallbackStreams.get(chatId) ?? [];
  list.push(streamId);
  fallbackStreams.set(chatId, list);

  try {
    if (process.env.POSTGRES_URL) {
      await db
        .insert(stream)
        .values({ chatId, createdAt: new Date(), id: streamId });
    }
  } catch {
    // Non-blocking
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    if (!process.env.POSTGRES_URL) {
      return fallbackStreams.get(chatId) ?? [];
    }
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch {
    return fallbackStreams.get(chatId) ?? [];
  }
}
