import type { UseChatHelpers } from "@ai-sdk/react";
import { ArrowDownIcon, ChevronDownIcon, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMessages } from "@/hooks/use-messages";
import type { Vote } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/provider";
import { useDataStream } from "./data-stream-provider";
import { Greeting } from "./greeting";
import { WorkspaceTemplates } from "./workspace-templates";
import { PreviewMessage, ThinkingMessage } from "./message";
import { SuggestedActions } from "./suggested-actions";
import type { VisibilityType } from "./visibility-selector";

type MessagesProps = {
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  selectedVisibilityType: VisibilityType;
  status: UseChatHelpers<ChatMessage>["status"];
  votes: Vote[] | undefined;
  messages: ChatMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  isReadonly: boolean;
  isArtifactVisible: boolean;
  isLoading?: boolean;
  selectedModelId: string;
  onEditMessage?: (message: ChatMessage) => void;
  onSuggestionSelect?: (prompt: string) => void;
};

function PureMessages({
  addToolApprovalResponse,
  chatId,
  sendMessage,
  selectedVisibilityType,
  status,
  votes,
  messages,
  setMessages,
  regenerate,
  isReadonly,
  isArtifactVisible,
  isLoading,
  selectedModelId: _selectedModelId,
  onEditMessage,
  onSuggestionSelect,
}: MessagesProps) {
  const { t } = useTranslation();
  const [activeHomeTab, setActiveHomeTab] = useState<"suggestions" | "templates">("suggestions");
  const {
    containerRef: messagesContainerRef,
    endRef: messagesEndRef,
    isAtBottom,
    scrollToBottom,
    hasSentMessage,
    reset,
  } = useMessages({
    status,
  });

  useDataStream();

  const prevChatIdRef = useRef(chatId);
  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      prevChatIdRef.current = chatId;
      reset();
    }
  }, [chatId, reset]);

  const handleScrollToBottom = useCallback(() => {
    scrollToBottom("smooth");
  }, [scrollToBottom]);

  return (
    <div className="relative flex-1 bg-background overflow-hidden">
      {messages.length === 0 && !isLoading && (
        <div className="absolute inset-0 z-10 overflow-y-auto overscroll-contain">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center gap-3.5 px-4 py-4 pb-28 sm:gap-4 sm:py-6 sm:pb-32">
            <Greeting />

            <div className="w-full flex items-center justify-between border-b border-border/40 pb-2 px-1">
              <div className="inline-flex items-center gap-1 rounded-xl bg-muted/50 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveHomeTab("suggestions")}
                  className={cn(
                    "rounded-lg px-3 py-1 font-medium transition-all text-xs cursor-pointer",
                    activeHomeTab === "suggestions"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t("workspace.home.ideas", "Idées suggérées")}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveHomeTab("templates")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1 font-medium transition-all text-xs cursor-pointer",
                    activeHomeTab === "templates"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Sparkles className="size-3 text-primary" />
                  {t("workspace.home.templates", "Modèles prêts à l’emploi")}
                </button>
              </div>
            </div>

            {activeHomeTab === "suggestions" ? (
              <SuggestedActions
                chatId={chatId}
                onSuggestionSelect={onSuggestionSelect}
                selectedVisibilityType={selectedVisibilityType}
                sendMessage={sendMessage}
              />
            ) : (
              <WorkspaceTemplates
                onSelectTemplate={(prompt) => {
                  if (onSuggestionSelect) {
                    onSuggestionSelect(prompt);
                  } else {
                    sendMessage({
                      parts: [{ text: prompt, type: "text" }],
                      role: "user",
                    });
                  }
                }}
              />
            )}
          </div>
        </div>
      )}
      <div
        className={cn(
          "absolute inset-0 touch-pan-y overflow-y-auto",
          messages.length > 0 ? "bg-background" : "bg-transparent"
        )}
        ref={messagesContainerRef}
        style={isArtifactVisible ? { scrollbarWidth: "none" } : undefined}
      >
        <div className="mx-auto flex min-h-full min-w-0 max-w-4xl flex-col gap-5 px-2 py-6 md:gap-7 md:px-4">
          {messages.map((message, index) => (
            <PreviewMessage
              addToolApprovalResponse={addToolApprovalResponse}
              chatId={chatId}
              isLoading={
                status === "streaming" && messages.length - 1 === index
              }
              isReadonly={isReadonly}
              key={message.id}
              message={message}
              onEdit={onEditMessage}
              regenerate={regenerate}
              requiresScrollPadding={
                hasSentMessage && index === messages.length - 1
              }
              setMessages={setMessages}
              vote={
                votes
                  ? votes.find((vote) => vote.messageId === message.id)
                  : undefined
              }
            />
          ))}

          {status === "submitted" && messages.at(-1)?.role !== "assistant" && (
            <ThinkingMessage />
          )}

          <div
            className="min-h-[24px] min-w-[24px] shrink-0"
            ref={messagesEndRef}
          />
        </div>
      </div>

      <button
        aria-label="Scroll to bottom"
        className={`absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border/60 bg-card/95 px-3.5 py-1.5 shadow-[var(--shadow-float)] backdrop-blur-lg transition-all duration-200 text-[11px] font-medium text-foreground cursor-pointer ${
          isAtBottom
            ? "pointer-events-none scale-90 opacity-0"
            : "pointer-events-auto scale-100 opacity-100"
        }`}
        onClick={handleScrollToBottom}
        type="button"
      >
        <ArrowDownIcon className="size-3.5 text-primary" />
        <span>{t("workspace.scrollToBottom", "Défiler vers le bas")}</span>
      </button>
    </div>
  );
}

export const Messages = PureMessages;
