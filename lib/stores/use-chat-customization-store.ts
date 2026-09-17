import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ChatCustomizationState {
  pinnedChatIds: string[];
  togglePin: (chatId: string) => void;
  isPinned: (chatId: string) => boolean;
}

export const useChatCustomizationStore = create<ChatCustomizationState>()(
  persist(
    (set, get) => ({
      pinnedChatIds: [],
      togglePin: (chatId: string) => {
        const { pinnedChatIds } = get();
        if (pinnedChatIds.includes(chatId)) {
          set({ pinnedChatIds: pinnedChatIds.filter((id) => id !== chatId) });
        } else {
          set({ pinnedChatIds: [chatId, ...pinnedChatIds] });
        }
      },
      isPinned: (chatId: string) => {
        return get().pinnedChatIds.includes(chatId);
      },
    }),
    {
      name: "idealy_chat_customizations",
    }
  )
);
