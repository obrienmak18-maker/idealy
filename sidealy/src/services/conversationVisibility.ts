import type { Conversation, Message } from "../types";

export function hasConversationActivity(
  conversation: Conversation,
  messages: Message[],
): boolean {
  if (conversation.isPinned || conversation.draft?.trim()) return true;

  // Locally created chats should not look like saved history until the user
  // has actually started them. Remote history remains visible while unloaded.
  if (conversation.id.startsWith("backend-chat-")) return true;
  if (conversation.id.startsWith("conv-")) {
    return messages.some((message) => message.conversationId === conversation.id);
  }

  return true;
}
