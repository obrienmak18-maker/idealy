"use client";

import { isToday, isYesterday, subMonths, subWeeks } from "date-fns";
import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "next-auth";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import useSWRInfinite from "swr/infinite";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import type { Chat } from "@/lib/db/schema";
import { fetcher } from "@/lib/utils";
import { LoaderIcon } from "./icons";
import { ChatItem } from "./sidebar-history-item";
import { useTranslation } from "@/lib/i18n/provider";
import { useChatCustomizationStore } from "@/lib/stores/use-chat-customization-store";
import { getChatHistoryPaginationKey } from "@/lib/chat-history-key";

export { getChatHistoryPaginationKey } from "@/lib/chat-history-key";

type GroupedChats = {
  today: Chat[];
  yesterday: Chat[];
  lastWeek: Chat[];
  lastMonth: Chat[];
  older: Chat[];
};

export type ChatHistory = {
  chats: Chat[];
  hasMore: boolean;
};

const groupChatsByDate = (chats: Chat[]): GroupedChats => {
  const now = new Date();
  const oneWeekAgo = subWeeks(now, 1);
  const oneMonthAgo = subMonths(now, 1);

  return chats.reduce(
    (groups, chat) => {
      const chatDate = new Date(chat.createdAt);

      if (isToday(chatDate)) {
        groups.today.push(chat);
      } else if (isYesterday(chatDate)) {
        groups.yesterday.push(chat);
      } else if (chatDate > oneWeekAgo) {
        groups.lastWeek.push(chat);
      } else if (chatDate > oneMonthAgo) {
        groups.lastMonth.push(chat);
      } else {
        groups.older.push(chat);
      }

      return groups;
    },
    {
      lastMonth: [],
      lastWeek: [],
      older: [],
      today: [],
      yesterday: [],
    } as GroupedChats
  );
};

export function SidebarHistory({ user }: { user: User | undefined }) {
  const { t } = useTranslation();
  const { pinnedChatIds } = useChatCustomizationStore();
  const { setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const id = pathname?.startsWith("/chat/") ? pathname.split("/")[2] : null;

  const {
    data: paginatedChatHistories,
    setSize,
    isValidating,
    isLoading,
    mutate,
  } = useSWRInfinite<ChatHistory>(
    user ? getChatHistoryPaginationKey : () => null,
    fetcher,
    { fallbackData: [], revalidateOnFocus: false }
  );

  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const hasReachedEnd = paginatedChatHistories
    ? paginatedChatHistories.some((page) => page.hasMore === false)
    : false;

  const hasEmptyChatHistory = paginatedChatHistories
    ? paginatedChatHistories.every((page) => page.chats.length === 0)
    : false;

  const handleDelete = useCallback(() => {
    const chatToDelete = deleteId;
    const isCurrentChat = pathname === `/chat/${chatToDelete}`;

    setShowDeleteDialog(false);

    if (isCurrentChat) {
      router.replace("/");
    }

    mutate((chatHistories) => {
      if (chatHistories) {
        return chatHistories.map((chatHistory) => ({
          ...chatHistory,
          chats: chatHistory.chats.filter((chat) => chat.id !== chatToDelete),
        }));
      }
    });

    fetch(
      `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/chat?id=${chatToDelete}`,
      { method: "DELETE" }
    );

    toast.success("Chat deleted");
  }, [deleteId, mutate, pathname, router]);

  const handleShowDeleteDialog = useCallback((chatId: string) => {
    setDeleteId(chatId);
    setShowDeleteDialog(true);
  }, []);

  const handleViewportEnter = useCallback(() => {
    if (!isValidating && !hasReachedEnd) {
      setSize((size) => size + 1);
    }
  }, [hasReachedEnd, isValidating, setSize]);

  if (!user) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupContent>
          <div className="flex w-full flex-row items-center justify-center gap-2 px-2 text-[13px] text-sidebar-foreground/60">
            Login to save and revisit previous chats!
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (isLoading) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70">
          History
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="flex flex-col gap-0.5 px-1">
            {[44, 32, 28, 64, 52].map((item) => (
              <div
                className="flex h-8 items-center gap-2 rounded-lg px-2"
                key={item}
              >
                <div
                  className="h-3 max-w-(--skeleton-width) flex-1 animate-pulse rounded-md bg-sidebar-foreground/[0.06]"
                  style={
                    {
                      "--skeleton-width": `${item}%`,
                    } as React.CSSProperties
                  }
                />
              </div>
            ))}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (hasEmptyChatHistory) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70">
          History
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="flex w-full flex-row items-center justify-center gap-2 px-2 text-[13px] text-sidebar-foreground/60">
            Your conversations will appear here once you start chatting!
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70">
          History
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {paginatedChatHistories
              ? (() => {
                  const chatsFromHistory = paginatedChatHistories.flatMap(
                    (paginatedChatHistory) => paginatedChatHistory.chats
                  );

                  const groupedChats = groupChatsByDate(chatsFromHistory);

                  return (
                    <div className="flex flex-col gap-4">
                      {chatsFromHistory.some((c) => pinnedChatIds.includes(c.id)) && (
                        <div>
                          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-500/80">
                            {t("sidebar.pinned", "Épinglés")}
                          </div>
                          {chatsFromHistory
                            .filter((c) => pinnedChatIds.includes(c.id))
                            .map((chat) => (
                              <ChatItem
                                chat={chat}
                                isActive={chat.id === id}
                                key={`pinned-${chat.id}`}
                                onDelete={handleShowDeleteDialog}
                                setOpenMobile={setOpenMobile}
                              />
                            ))}
                        </div>
                      )}

                      {groupedChats.today.filter((c) => !pinnedChatIds.includes(c.id)).length > 0 && (
                        <div>
                          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70">
                            {t("sidebar.today", "Aujourd'hui")}
                          </div>
                          {groupedChats.today
                            .filter((c) => !pinnedChatIds.includes(c.id))
                            .map((chat) => (
                              <ChatItem
                                chat={chat}
                                isActive={chat.id === id}
                                key={chat.id}
                                onDelete={handleShowDeleteDialog}
                                setOpenMobile={setOpenMobile}
                              />
                            ))}
                        </div>
                      )}

                      {groupedChats.yesterday.filter((c) => !pinnedChatIds.includes(c.id)).length > 0 && (
                        <div>
                          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70">
                            {t("sidebar.yesterday", "Hier")}
                          </div>
                          {groupedChats.yesterday
                            .filter((c) => !pinnedChatIds.includes(c.id))
                            .map((chat) => (
                              <ChatItem
                                chat={chat}
                                isActive={chat.id === id}
                                key={chat.id}
                                onDelete={handleShowDeleteDialog}
                                setOpenMobile={setOpenMobile}
                              />
                            ))}
                        </div>
                      )}

                      {groupedChats.lastWeek.filter((c) => !pinnedChatIds.includes(c.id)).length > 0 && (
                        <div>
                          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70">
                            {t("sidebar.lastWeek", "7 derniers jours")}
                          </div>
                          {groupedChats.lastWeek
                            .filter((c) => !pinnedChatIds.includes(c.id))
                            .map((chat) => (
                              <ChatItem
                                chat={chat}
                                isActive={chat.id === id}
                                key={chat.id}
                                onDelete={handleShowDeleteDialog}
                                setOpenMobile={setOpenMobile}
                              />
                            ))}
                        </div>
                      )}

                      {groupedChats.lastMonth.filter((c) => !pinnedChatIds.includes(c.id)).length > 0 && (
                        <div>
                          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70">
                            {t("sidebar.lastMonth", "30 derniers jours")}
                          </div>
                          {groupedChats.lastMonth
                            .filter((c) => !pinnedChatIds.includes(c.id))
                            .map((chat) => (
                              <ChatItem
                                chat={chat}
                                isActive={chat.id === id}
                                key={chat.id}
                                onDelete={handleShowDeleteDialog}
                                setOpenMobile={setOpenMobile}
                              />
                            ))}
                        </div>
                      )}

                      {groupedChats.older.filter((c) => !pinnedChatIds.includes(c.id)).length > 0 && (
                        <div>
                          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70">
                            {t("sidebar.older", "Plus anciens")}
                          </div>
                          {groupedChats.older
                            .filter((c) => !pinnedChatIds.includes(c.id))
                            .map((chat) => (
                              <ChatItem
                                chat={chat}
                                isActive={chat.id === id}
                                key={chat.id}
                                onDelete={handleShowDeleteDialog}
                                setOpenMobile={setOpenMobile}
                              />
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })()
              : null}
          </SidebarMenu>

          <motion.div onViewportEnter={handleViewportEnter} />

          {hasReachedEnd ? null : (
            <div className="mt-1 flex flex-row items-center gap-2 px-4 py-2 text-sidebar-foreground/50">
              <div className="animate-spin">
                <LoaderIcon />
              </div>
              <div className="text-[11px]">{t("common.loading", "Chargement...")}</div>
            </div>
          )}
        </SidebarGroupContent>
      </SidebarGroup>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sidebar.deleteTitle", "Supprimer cette discussion ?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("sidebar.deleteDescription", "Cette action est irréversible. La discussion sera définitivement supprimée.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Annuler")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t("sidebar.delete", "Supprimer")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
