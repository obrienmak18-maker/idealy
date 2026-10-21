import type { UseChatHelpers } from "@ai-sdk/react";
import { ArrowDownIcon, FileText, Sparkles } from "lucide-react";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useMessages } from "@/hooks/use-messages";
import { useArtifact } from "@/hooks/use-artifact";
import type { Vote } from "@/lib/db/schema";
import { useTranslation } from "@/lib/i18n/provider";
import { AnimatePresence, motion } from "framer-motion";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useDataStream } from "./data-stream-provider";
import { Greeting } from "./greeting";
import { IntakeSpecificationForm } from "./intake-specification-form";
import { MissionPlanCard } from "./mission-plan-card";
import { PreviewMessage, ThinkingMessage } from "./message";
import { SuggestedActions } from "./suggested-actions";
import type { VisibilityType } from "./visibility-selector";
import { WorkspaceTemplates } from "./workspace-templates";
import { alvinMessenger, voiesCatalog } from "@/lib/idealy/voies-catalog";
import { useGamificationStore } from "@/lib/stores/use-gamification-store";
import type { PlanOption } from "./plan-choices";
import { MultiAgentRelay } from "./multi-agent-relay";

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
  const { currentWay } = useGamificationStore();
  const { metadata } = useArtifact();
  const activeWayData = voiesCatalog[currentWay] ?? voiesCatalog.ninja;
  const chiefAgent =
    activeWayData.agents.find((agent) => agent.isChief) ?? activeWayData.agents[0];

  const missionId = typeof metadata?.missionId === "string" ? metadata.missionId : null;
  const missionSquadStatus = typeof metadata?.missionSquadStatus === "string" ? metadata.missionSquadStatus : null;
  const missionIsActive =
    missionSquadStatus === "building" ||
    missionSquadStatus === "reviewing" ||
    missionSquadStatus === "auto_correction_started";
  const missionAgentName =
    typeof metadata?.missionActiveAgentName === "string" && metadata.missionActiveAgentName.trim()
      ? metadata.missionActiveAgentName.trim()
      : chiefAgent.name;
  const missionActiveAgent =
    activeWayData.agents.find((agent) => agent.name.toLowerCase() === missionAgentName.toLowerCase()) ??
    chiefAgent;
  const missionAgentRole =
    typeof metadata?.missionActiveAgentRole === "string" && metadata.missionActiveAgentRole.trim()
      ? metadata.missionActiveAgentRole.trim()
      : missionActiveAgent.role;
  const missionFileCount = Array.isArray(metadata?.missionFiles)
    ? metadata.missionFiles.filter((file) =>
        Boolean(file && typeof file === "object" &&
          "status" in file && (file.status === "saved" || file.status === "validated"))
      ).length
    : 0;
  const [activeHomeTab, setActiveHomeTab] = useState<
    "suggestions" | "templates" | "specification"
  >("suggestions");
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (
        activeTag === "input" ||
        activeTag === "textarea" ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      if (!messagesContainerRef.current) {
        return;
      }
      const el = messagesContainerRef.current;
      switch (e.key) {
        case "PageDown":
          e.preventDefault();
          el.scrollBy({ behavior: "smooth", top: el.clientHeight - 40 });
          break;
        case "PageUp":
          e.preventDefault();
          el.scrollBy({ behavior: "smooth", top: -(el.clientHeight - 40) });
          break;
        case "Home":
          e.preventDefault();
          el.scrollTo({ behavior: "smooth", top: 0 });
          break;
        case "End":
          e.preventDefault();
          el.scrollTo({ behavior: "smooth", top: el.scrollHeight });
          break;
        case "ArrowDown":
          e.preventDefault();
          el.scrollBy({ behavior: "smooth", top: 80 });
          break;
        case "ArrowUp":
          e.preventDefault();
          el.scrollBy({ behavior: "smooth", top: -80 });
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [messagesContainerRef]);

  const handleSelectSuggestions = useCallback(() => {
    setActiveHomeTab("suggestions");
  }, []);

  const handleSelectTemplates = useCallback(() => {
    setActiveHomeTab("templates");
  }, []);

  const handleSelectSpecification = useCallback(() => {
    setActiveHomeTab("specification");
  }, []);

  const handleSelectTemplate = useCallback(
    (prompt: string) => {
      if (onSuggestionSelect) {
        onSuggestionSelect(prompt);
      } else {
        sendMessage({
          parts: [{ text: prompt, type: "text" }],
          role: "user",
        });
      }
    },
    [onSuggestionSelect, sendMessage]
  );

  const handlePlanSelection = useCallback(
    (option: PlanOption) => {
      const brief =
        `Je valide la direction « ${option.title} » : ${option.description}. Continue dans cette conversation à partir de ce choix, mets à jour le plan concret, puis exécute la mission. Ne prétends pas qu'une étape ou une intégration fonctionne tant qu'elle n'a pas été réellement vérifiée.`;
      sendMessage({
        parts: [{ text: brief, type: "text" }],
        role: "user",
      });
    },
    [sendMessage]
  );

  const handleIntakeSubmit = useCallback(
    (formattedBrief: string) => {
      sendMessage({
        parts: [{ text: formattedBrief, type: "text" }],
        role: "user",
      });
    },
    [sendMessage]
  );

  const handleIntakeCancel = useCallback(() => {
    setActiveHomeTab("suggestions");
  }, []);

  const latestExecutionPlanMessageId = [...messages]
    .reverse()
    .find(
      (candidate) =>
        candidate.role === "assistant" &&
        candidate.parts.some(
          (part) =>
            part.type === "text" &&
            /plan enregistré pour/i.test(part.text)
        )
    )?.id;

  return (
    <div className="relative flex-1 bg-background overflow-hidden">
      {messages.length === 0 && !isLoading && (
        <div className="absolute inset-0 z-10 overflow-y-auto overscroll-contain">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center gap-3.5 px-4 py-4 pb-28 sm:gap-4 sm:py-6 sm:pb-32">
            <Greeting />

            <div className="w-full flex items-center justify-between border-b border-border/40 pb-2 px-1">
              <div className="inline-flex items-center gap-1 rounded-xl bg-muted/50 p-1 text-xs">
                <button
                  className={cn(
                    "rounded-lg px-3 py-1 font-medium transition-all text-xs cursor-pointer",
                    activeHomeTab === "suggestions"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={handleSelectSuggestions}
                  type="button"
                >
                  {t("workspace.home.ideas", "Idées suggérées")}
                </button>
                <button
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1 font-medium transition-all text-xs cursor-pointer",
                    activeHomeTab === "templates"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={handleSelectTemplates}
                  type="button"
                >
                  <Sparkles className="size-3 text-primary" />
                  {t("workspace.home.templates", "Modèles prêts à l’emploi")}
                </button>
                <button
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1 font-medium transition-all text-xs cursor-pointer",
                    activeHomeTab === "specification"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={handleSelectSpecification}
                  type="button"
                >
                  <FileText className="size-3 text-emerald-500" />
                  <span>Cadrage 6 questions</span>
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={activeHomeTab} className="w-full" initial={{ opacity: 0, y: 8, filter: "blur(3px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -6, filter: "blur(2px)" }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
                {activeHomeTab === "suggestions" ? <SuggestedActions chatId={chatId} onSuggestionSelect={onSuggestionSelect} selectedVisibilityType={selectedVisibilityType} sendMessage={sendMessage} /> : activeHomeTab === "templates" ? <WorkspaceTemplates onSelectTemplate={handleSelectTemplate} /> : <IntakeSpecificationForm onCancel={handleIntakeCancel} onSubmit={handleIntakeSubmit} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}
      {(messages.length > 0 || isLoading) && (
        <section
          aria-label="Historique des messages"
          className="absolute inset-0 touch-pan-y overflow-y-auto bg-background focus:outline-none"
          ref={messagesContainerRef}
          style={isArtifactVisible ? { scrollbarWidth: "thin" } : undefined}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: Scrollable region requires tabIndex for keyboard navigation
          tabIndex={0}
        >
          <div className="mx-auto flex min-h-full min-w-0 max-w-4xl flex-col gap-5 px-2 py-6 md:gap-7 md:px-4">
            {messages.map((message, index) => {
              const priorUserMessage =
                message.role === "assistant"
                  ? [...messages.slice(0, index)]
                      .reverse()
                      .find((candidate) => candidate.role === "user")
                  : undefined;
              const priorUserText =
                priorUserMessage?.parts
                  ?.filter((part) => part.type === "text")
                  .map((part) => part.text)
                  .join(" ") ?? "";
              const isAlvinRequested =
                /(?:^|\s)@alvin\b|^\s*alvin\s*[,!:]|(?:appelle|appeler|sollicite|solliciter|parle|parler|demande|demander)\s+(?:à\s+)?alvin\b|je\s+veux\s+(?:parler\s+à|appeler)\s+alvin/i.test(
                  priorUserText
                );

              const showsExecutionPlan =
                message.role === "assistant" &&
                message.id === latestExecutionPlanMessageId;

              return (
                <Fragment key={message.id}>
                  <PreviewMessage
                    addToolApprovalResponse={addToolApprovalResponse}
                    chatId={chatId}
                    isAlvinRequested={isAlvinRequested}
                    isFirstAssistantMessage={
                      message.role === "assistant" &&
                      messages.find((candidate) => candidate.role === "assistant")?.id ===
                        message.id
                    }
                    isLoading={
                      status === "streaming" && messages.length - 1 === index
                    }
                    isReadonly={isReadonly}
                    message={message}
                    onEdit={onEditMessage}
                    onPlanSelection={handlePlanSelection}
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
                  {showsExecutionPlan ? <MissionPlanCard /> : null}
                </Fragment>
              );
            })}

            {missionId && missionIsActive ? (
              <MultiAgentRelay
                activityState={
                  missionSquadStatus === "reviewing"
                    ? "reviewing"
                    : missionSquadStatus === "auto_correction_started"
                      ? "correcting"
                      : "building"
                }
                currentAgentAvatar={missionActiveAgent.avatarUrl}
                currentAgentName={missionActiveAgent.name}
                currentAgentRole={missionAgentRole}
                currentWay={currentWay}
                filesCount={missionFileCount}
              />
            ) : null}

            {status === "submitted" &&
              messages.at(-1)?.role !== "assistant" && (
                <ThinkingMessage
                  agentAvatar={
                    messages.some((message) => message.role === "assistant") &&
                    !/(?:^|\s)@alvin\b|^\s*alvin\s*[,!:]|(?:appelle|appeler|sollicite|solliciter|parle|parler|demande|demander)\s+(?:à\s+)?alvin\b|je\s+veux\s+(?:parler\s+à|appeler)\s+alvin/i.test(
                      messages
                        .at(-1)
                        ?.parts.filter((part) => part.type === "text")
                        .map((part) => part.text)
                        .join(" ") ?? ""
                    )
                      ? chiefAgent?.avatarUrl ?? alvinMessenger.avatarUrl
                      : alvinMessenger.avatarUrl
                  }
                  agentName={
                    messages.some((message) => message.role === "assistant") &&
                    !/(?:^|\s)@alvin\b|^\s*alvin\s*[,!:]|(?:appelle|appeler|sollicite|solliciter|parle|parler|demande|demander)\s+(?:à\s+)?alvin\b|je\s+veux\s+(?:parler\s+à|appeler)\s+alvin/i.test(
                      messages
                        .at(-1)
                        ?.parts.filter((part) => part.type === "text")
                        .map((part) => part.text)
                        .join(" ") ?? ""
                    )
                      ? chiefAgent?.name ?? "Chef d'équipe"
                      : alvinMessenger.name
                  }
                />
              )}

            <div
              className="min-h-[24px] min-w-[24px] shrink-0"
              ref={messagesEndRef}
            />
          </div>
        </section>
      )}
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
