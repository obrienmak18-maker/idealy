"use server";

import { generateText, type UIMessage } from "ai";
import { cookies } from "next/headers";
import { auth } from "@/app/(auth)/auth";
import type { VisibilityType } from "@/components/chat/visibility-selector";
import { titlePrompt } from "@/lib/ai/prompts";
import { getTitleModel } from "@/lib/ai/providers";
import {
  deleteMessagesByChatIdAfterTimestamp,
  getChatById,
  getMessageById,
  updateChatVisibilityById,
} from "@/lib/db/queries";
import { getTextFromMessage } from "@/lib/utils";

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set("chat-model", model);
}

function fallbackTitleFromMessage(message: UIMessage): string {
  const text = getTextFromMessage(message).replace(/\\s+/g, " ").trim();
  if (!text) return "Nouvelle discussion";
  return text.length > 64 ? `${text.slice(0, 61).trimEnd()}…` : text;
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
  const fallback = fallbackTitleFromMessage(message);
  try {
    const { text } = await generateText({
      instructions: titlePrompt,
      model: getTitleModel(),
      prompt: getTextFromMessage(message),
    });
    const title = text
      .replace(/^[#*"\\s]+/, "")
      .replace(/["]+$/, "")
      .trim();
    return title || fallback;
  } catch {
    // Title generation is ancillary and must never block the actual chat.
    return fallback;
  }
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return;
    }

    const [message] = await getMessageById({ id });
    if (!message) {
      return;
    }

    const chat = await getChatById({ id: message.chatId });
    if (!chat || chat.userId !== session.user.id) {
      return;
    }

    await deleteMessagesByChatIdAfterTimestamp({
      chatId: message.chatId,
      timestamp: message.createdAt,
    });
  } catch (error) {
    console.warn("deleteTrailingMessages skipped non-fatally:", error);
  }
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const chat = await getChatById({ id: chatId });
  if (!chat || chat.userId !== session.user.id) {
    throw new Error("Unauthorized");
  }

  await updateChatVisibilityById({ chatId, visibility });
}
