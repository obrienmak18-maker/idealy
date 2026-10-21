"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { IdealyMark } from "@/components/branding/idealy-logo";
import type { Vote } from "@/lib/db/schema";
import { useTranslation } from "@/lib/i18n/provider";
import { alvinMessenger, voiesCatalog } from "@/lib/idealy/voies-catalog";
import { useGamificationStore } from "@/lib/stores/use-gamification-store";
import type { ChatMessage } from "@/lib/types";
import { cn, sanitizeText } from "@/lib/utils";
import { MessageContent, MessageResponse } from "../ai-elements/message";
import { Shimmer } from "../ai-elements/shimmer";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "../ai-elements/tool";
import { useDataStream } from "./data-stream-provider";
import { DocumentToolResult } from "./document";
import { DocumentPreview } from "./document-preview";
import { MessageActions } from "./message-actions";
import { MessageReasoning } from "./message-reasoning";
import { MultiAgentRelay } from "./multi-agent-relay";
import { extractPlanOptionsFromText, PlanChoices } from "./plan-choices";
import { PreviewAttachment } from "./preview-attachment";
import { Weather } from "./weather";

function WaitingText() {
  const { waitingStatus } = useDataStream();
  const waitingText =
    waitingStatus?.message ?? "L'escouade prépare l'intervention…";

  return (
    <div className="flex min-h-[calc(13px*1.65)] min-w-0 items-center text-[13px] leading-[1.65]">
      <Shimmer
        as="span"
        className="font-medium whitespace-normal break-words"
        duration={1}
      >
        {waitingText}
      </Shimmer>
    </div>
  );
}

function ToolApprovalActions({
  addToolApprovalResponse,
  approvalId,
}: {
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
  approvalId: string;
}) {
  const { t } = useTranslation();
  const handleDeny = useCallback(() => {
    addToolApprovalResponse({
      approved: false,
      id: approvalId,
      reason: "User denied weather lookup",
    });
  }, [addToolApprovalResponse, approvalId]);

  const handleAllow = useCallback(() => {
    addToolApprovalResponse({
      approved: true,
      id: approvalId,
    });
  }, [addToolApprovalResponse, approvalId]);

  return (
    <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
      <button
        className="rounded-md px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
        onClick={handleDeny}
        type="button"
      >
        {t("chat.toolApproval.deny", "Refuser")}
      </button>
      <button
        className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-sm transition-colors hover:bg-primary/90"
        onClick={handleAllow}
        type="button"
      >
        {t("chat.toolApproval.allow", "Autoriser")}
      </button>
    </div>
  );
}

function parseProgressiveSections(text: string): {
  conclusion: string | null;
  status: { fait?: string; reste?: string; attention?: string } | null;
  lineCount: number;
  isLong: boolean;
} {
  const lines = text.split("\n");
  const lineCount = lines.length;
  const isLong = text.length > 220 || lineCount > 4;

  let fait: string | undefined;
  let reste: string | undefined;
  let attention: string | undefined;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const faitMatch = line.match(
      /^(?:[-*•]\s*)?(?:✓\s*|\[x\]\s*)?(?:Fait|Ce qui a été fait)\s*:\s*(.+)$/i
    );
    if (faitMatch?.[1]) {
      fait = faitMatch[1].trim();
    }

    const resteMatch = line.match(
      /^(?:[-*•]\s*)?(?:⏳\s*|\[\s*\]\s*)?(?:Reste|Ce qui reste)\s*:\s*(.+)$/i
    );
    if (resteMatch?.[1]) {
      reste = resteMatch[1].trim();
    }

    const attentionMatch = line.match(
      /^(?:[-*•]\s*)?(?:⚠️\s*|!\s*)?(?:Attention|Point d'attention|Points d'attention)\s*:\s*(.+)$/i
    );
    if (attentionMatch?.[1]) {
      attention = attentionMatch[1].trim();
    }
  }

  const hasStatus = Boolean(fait || reste || attention);

  let conclusion: string | null = null;
  const firstNonEmpty = lines.find((l) => l.trim().length > 0)?.trim();
  if (firstNonEmpty && isLong) {
    const cleanFirst = firstNonEmpty.replace(/^#+\s*/, "");
    conclusion =
      cleanFirst.length > 140 ? `${cleanFirst.slice(0, 137)}…` : cleanFirst;
  }

  return {
    conclusion,
    isLong,
    lineCount,
    status: hasStatus ? { attention, fait, reste } : null,
  };
}

function ProgressiveTextMessage({
  text,
  isAssistant,
  isLoading,
}: {
  text: string;
  isAssistant: boolean;
  isLoading: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();
  const { conclusion, status, lineCount, isLong } =
    parseProgressiveSections(text);
  const planOptions = isAssistant ? extractPlanOptionsFromText(text) : null;

  const handleToggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleSelectPlanOption = useCallback(
    (option: { description: string; title: string }) => {
      const brief = `Je choisis la direction « ${option.title} » : ${option.description}. Établis le plan d'action détaillé et lance la mission sur cette base.`;
      router.push(`/chat?prompt=${encodeURIComponent(brief)}`);
    },
    [router]
  );

  const shouldCollapse = isAssistant && isLong && !isLoading && !isExpanded;

  return (
    <div className="w-full space-y-2">
      {/* ① Conclusion en une phrase visible immédiatement */}
      {isAssistant && conclusion && isLong && !isLoading && (
        <div className="rounded-lg bg-surface-container-lowest/80 border border-border/50 px-3 py-2 text-[13px] font-medium text-foreground/90 shadow-xs">
          <span className="text-primary font-semibold mr-1.5">En résumé :</span>
          {conclusion}
        </div>
      )}

      {/* ③ Détails et contenu principal (repliés par défaut à 180px si long) */}
      <div
        className={cn("relative transition-[max-height] duration-200", {
          "max-h-[180px] overflow-hidden": shouldCollapse,
        })}
      >
        <MessageContent
          className={cn("text-[14px] leading-[1.75] md:text-[15px]", {
            "idealy-bubble-user w-fit max-w-[min(80%,56ch)] overflow-hidden break-words rounded-2xl rounded-br-sm px-3.5 py-2.5 shadow-sm":
              !isAssistant,
          })}
          data-testid="message-content"
        >
          <MessageResponse
            caret={isAssistant && isLoading ? "circle" : undefined}
            isAnimating={isAssistant && isLoading}
          >
            {sanitizeText(text)}
          </MessageResponse>
        </MessageContent>

        {shouldCollapse && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
        )}
      </div>

      {isAssistant && isLong && !isLoading && (
        <button
          aria-expanded={isExpanded}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer"
          onClick={handleToggleExpand}
          type="button"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="size-3.5" />
              <span>Replier les détails</span>
            </>
          ) : (
            <>
              <ChevronDown className="size-3.5" />
              <span>Afficher les détails ({lineCount} lignes)</span>
            </>
          )}
        </button>
      )}

      {/* ④ Statut structuré (Fait / Reste / Attention) */}
      {isAssistant && status && (
        <div className="mt-2.5 rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs space-y-1.5">
          {status.fait && (
            <div className="flex items-start gap-2 text-foreground/90">
              <CheckCircle2 className="size-3.5 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Fait :{" "}
                </span>
                {status.fait}
              </div>
            </div>
          )}
          {status.reste && (
            <div className="flex items-start gap-2 text-foreground/90">
              <Clock className="size-3.5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  Reste :{" "}
                </span>
                {status.reste}
              </div>
            </div>
          )}
          {status.attention && (
            <div className="flex items-start gap-2 text-foreground/90">
              <AlertTriangle className="size-3.5 text-rose-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  Attention :{" "}
                </span>
                {status.attention}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ② Résultat / Plan d'action */}
      {planOptions && planOptions.length >= 2 && (
        <PlanChoices onSelectOption={handleSelectPlanOption} options={planOptions} />
      )}
    </div>
  );
}

const PurePreviewMessage = ({
  addToolApprovalResponse,
  chatId,
  message,
  vote,
  isLoading,
  setMessages: _setMessages,
  regenerate,
  isReadonly,
  requiresScrollPadding: _requiresScrollPadding,
  onEdit,
  isFirstAssistantMessage = false,
  isAlvinRequested = false,
}: {
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
  onEdit?: (message: ChatMessage) => void;
  isFirstAssistantMessage?: boolean;
  isAlvinRequested?: boolean;
}) => {
  const attachmentsFromMessage = message.parts.filter(
    (part) => part.type === "file"
  );

  useDataStream();

  const { t } = useTranslation();

  const { currentWay } = useGamificationStore();
  const activeWayData = voiesCatalog[currentWay] ?? voiesCatalog.ninja;
  const chiefAgent =
    activeWayData?.agents?.find((a) => a.isChief) ?? activeWayData?.agents?.[0];
  const builderAgent =
    activeWayData?.agents?.find(
      (a) =>
        a.role.toLowerCase().includes("builder") ||
        a.name === "Naruto" ||
        a.name === "Natsu" ||
        a.name === "Gon" ||
        a.name === "Elena"
    ) ?? activeWayData?.agents?.[1];
  const qaAgent =
    activeWayData?.agents?.find(
      (a) =>
        a.role.toLowerCase().includes("qa") ||
        a.name === "Shikamaru" ||
        a.name === "Thomas"
    ) ?? activeWayData?.agents?.[activeWayData.agents.length - 1];

  const messageText = message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\\n");
  const normalizedMessageText = messageText.toLocaleLowerCase("fr");
  const hasMissionActivity =
    /plan enregistré|chef d['’]escouade|build complete|l['’]escouade prend le relais|relais au chef|mission de construction|génération de l['’]application|création de l['’]application|application est prête/i.test(
      normalizedMessageText
    );
  const handoffToChief =
    /relais au chef|chef d['’]escouade prend le relais|plan remis au chef|le chef coordonne/i.test(
      normalizedMessageText
    );
  const explicitReviewResult =
    /vérification finale terminée|tests? (?:sont )?(?:passés|réussis)|validation finale (?:effectuée|terminée|réussie)/i.test(
      normalizedMessageText
    );

  // Alvin is introduced once per conversation and appears again only when the
  // user explicitly calls him. Other replies belong to the squad chief.
  // Builder/Reviewer labels are shown only when the visible response supports
  // that stage; the UI must not pretend to know an agent's internal state.
  const activeAgent = isAlvinRequested || isFirstAssistantMessage
    ? alvinMessenger
    : handoffToChief
      ? (chiefAgent ?? alvinMessenger)
      : hasMissionActivity && isLoading
        ? (builderAgent ?? chiefAgent ?? alvinMessenger)
        : hasMissionActivity && explicitReviewResult
          ? (qaAgent ?? chiefAgent ?? alvinMessenger)
          : (chiefAgent ?? alvinMessenger);
  const agentName = activeAgent.name;
  const agentRole = activeAgent.role;
  const agentAvatar = activeAgent.avatarUrl;"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { IdealyMark } from "@/components/branding/idealy-logo";
import type { Vote } from "@/lib/db/schema";
import { useTranslation } from "@/lib/i18n/provider";
import { alvinMessenger, voiesCatalog } from "@/lib/idealy/voies-catalog";
import { useGamificationStore } from "@/lib/stores/use-gamification-store";
import type { ChatMessage } from "@/lib/types";
import { cn, sanitizeText } from "@/lib/utils";
import { MessageContent, MessageResponse } from "../ai-elements/message";
import { Shimmer } from "../ai-elements/shimmer";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "../ai-elements/tool";
import { useDataStream } from "./data-stream-provider";
import { DocumentToolResult } from "./document";
import { DocumentPreview } from "./document-preview";
import { MessageActions } from "./message-actions";
import { MessageReasoning } from "./message-reasoning";
import { MultiAgentRelay } from "./multi-agent-relay";
import { extractPlanOptionsFromText, PlanChoices } from "./plan-choices";
import { PreviewAttachment } from "./preview-attachment";
import { Weather } from "./weather";

function WaitingText() {
  const { waitingStatus } = useDataStream();
  const waitingText =
    waitingStatus?.message ?? "L'escouade prépare l'intervention…";

  return (
    <div className="flex min-h-[calc(13px*1.65)] min-w-0 items-center text-[13px] leading-[1.65]">
      <Shimmer
        as="span"
        className="font-medium whitespace-normal break-words"
        duration={1}
      >
        {waitingText}
      </Shimmer>
    </div>
  );
}

function ToolApprovalActions({
  addToolApprovalResponse,
  approvalId,
}: {
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
  approvalId: string;
}) {
  const { t } = useTranslation();
  const handleDeny = useCallback(() => {
    addToolApprovalResponse({
      approved: false,
      id: approvalId,
      reason: "User denied weather lookup",
    });
  }, [addToolApprovalResponse, approvalId]);

  const handleAllow = useCallback(() => {
    addToolApprovalResponse({
      approved: true,
      id: approvalId,
    });
  }, [addToolApprovalResponse, approvalId]);

  return (
    <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
      <button
        className="rounded-md px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
        onClick={handleDeny}
        type="button"
      >
        {t("chat.toolApproval.deny", "Refuser")}
      </button>
      <button
        className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-sm transition-colors hover:bg-primary/90"
        onClick={handleAllow}
        type="button"
      >
        {t("chat.toolApproval.allow", "Autoriser")}
      </button>
    </div>
  );
}

function parseProgressiveSections(text: string): {
  conclusion: string | null;
  status: { fait?: string; reste?: string; attention?: string } | null;
  lineCount: number;
  isLong: boolean;
} {
  const lines = text.split("\n");
  const lineCount = lines.length;
  const isLong = text.length > 220 || lineCount > 4;

  let fait: string | undefined;
  let reste: string | undefined;
  let attention: string | undefined;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const faitMatch = line.match(
      /^(?:[-*•]\s*)?(?:✓\s*|\[x\]\s*)?(?:Fait|Ce qui a été fait)\s*:\s*(.+)$/i
    );
    if (faitMatch?.[1]) {
      fait = faitMatch[1].trim();
    }

    const resteMatch = line.match(
      /^(?:[-*•]\s*)?(?:⏳\s*|\[\s*\]\s*)?(?:Reste|Ce qui reste)\s*:\s*(.+)$/i
    );
    if (resteMatch?.[1]) {
      reste = resteMatch[1].trim();
    }

    const attentionMatch = line.match(
      /^(?:[-*•]\s*)?(?:⚠️\s*|!\s*)?(?:Attention|Point d'attention|Points d'attention)\s*:\s*(.+)$/i
    );
    if (attentionMatch?.[1]) {
      attention = attentionMatch[1].trim();
    }
  }

  const hasStatus = Boolean(fait || reste || attention);

  let conclusion: string | null = null;
  const firstNonEmpty = lines.find((l) => l.trim().length > 0)?.trim();
  if (firstNonEmpty && isLong) {
    const cleanFirst = firstNonEmpty.replace(/^#+\s*/, "");
    conclusion =
      cleanFirst.length > 140 ? `${cleanFirst.slice(0, 137)}…` : cleanFirst;
  }

  return {
    conclusion,
    isLong,
    lineCount,
    status: hasStatus ? { attention, fait, reste } : null,
  };
}

function ProgressiveTextMessage({
  text,
  isAssistant,
  isLoading,
}: {
  text: string;
  isAssistant: boolean;
  isLoading: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();
  const { conclusion, status, lineCount, isLong } =
    parseProgressiveSections(text);
  const planOptions = isAssistant ? extractPlanOptionsFromText(text) : null;

  const handleToggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleSelectPlanOption = useCallback(
    (option: { description: string; title: string }) => {
      const brief = `Je choisis la direction « ${option.title} » : ${option.description}. Établis le plan d'action détaillé et lance la mission sur cette base.`;
      router.push(`/chat?prompt=${encodeURIComponent(brief)}`);
    },
    [router]
  );

  const shouldCollapse = isAssistant && isLong && !isLoading && !isExpanded;

  return (
    <div className="w-full space-y-2">
      {/* ① Conclusion en une phrase visible immédiatement */}
      {isAssistant && conclusion && isLong && !isLoading && (
        <div className="rounded-lg bg-surface-container-lowest/80 border border-border/50 px-3 py-2 text-[13px] font-medium text-foreground/90 shadow-xs">
          <span className="text-primary font-semibold mr-1.5">En résumé :</span>
          {conclusion}
        </div>
      )}

      {/* ③ Détails et contenu principal (repliés par défaut à 180px si long) */}
      <div
        className={cn("relative transition-[max-height] duration-200", {
          "max-h-[180px] overflow-hidden": shouldCollapse,
        })}
      >
        <MessageContent
          className={cn("text-[14px] leading-[1.75] md:text-[15px]", {
            "idealy-bubble-user w-fit max-w-[min(80%,56ch)] overflow-hidden break-words rounded-2xl rounded-br-sm px-3.5 py-2.5 shadow-sm":
              !isAssistant,
          })}
          data-testid="message-content"
        >
          <MessageResponse
            caret={isAssistant && isLoading ? "circle" : undefined}
            isAnimating={isAssistant && isLoading}
          >
            {sanitizeText(text)}
          </MessageResponse>
        </MessageContent>

        {shouldCollapse && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
        )}
      </div>

      {isAssistant && isLong && !isLoading && (
        <button
          aria-expanded={isExpanded}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer"
          onClick={handleToggleExpand}
          type="button"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="size-3.5" />
              <span>Replier les détails</span>
            </>
          ) : (
            <>
              <ChevronDown className="size-3.5" />
              <span>Afficher les détails ({lineCount} lignes)</span>
            </>
          )}
        </button>
      )}

      {/* ④ Statut structuré (Fait / Reste / Attention) */}
      {isAssistant && status && (
        <div className="mt-2.5 rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs space-y-1.5">
          {status.fait && (
            <div className="flex items-start gap-2 text-foreground/90">
              <CheckCircle2 className="size-3.5 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Fait :{" "}
                </span>
                {status.fait}
              </div>
            </div>
          )}
          {status.reste && (
            <div className="flex items-start gap-2 text-foreground/90">
              <Clock className="size-3.5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  Reste :{" "}
                </span>
                {status.reste}
              </div>
            </div>
          )}
          {status.attention && (
            <div className="flex items-start gap-2 text-foreground/90">
              <AlertTriangle className="size-3.5 text-rose-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  Attention :{" "}
                </span>
                {status.attention}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ② Résultat / Plan d'action */}
      {planOptions && planOptions.length >= 2 && (
        <PlanChoices onSelectOption={handleSelectPlanOption} options={planOptions} />
      )}
    </div>
  );
}

const PurePreviewMessage = ({
  addToolApprovalResponse,
  chatId,
  message,
  vote,
  isLoading,
  setMessages: _setMessages,
  regenerate,
  isReadonly,
  requiresScrollPadding: _requiresScrollPadding,
  onEdit,
  isFirstAssistantMessage = false,
  isAlvinRequested = false,
}: {
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
  onEdit?: (message: ChatMessage) => void;
  isFirstAssistantMessage?: boolean;
  isAlvinRequested?: boolean;
}) => {
  const attachmentsFromMessage = message.parts.filter(
    (part) => part.type === "file"
  );

  useDataStream();

  const { t } = useTranslation();

  const { currentWay } = useGamificationStore();
  const activeWayData = voiesCatalog[currentWay] ?? voiesCatalog.ninja;
  const chiefAgent =
    activeWayData?.agents?.find((a) => a.isChief) ?? activeWayData?.agents?.[0];
  const builderAgent =
    activeWayData?.agents?.find(
      (a) =>
        a.role.toLowerCase().includes("builder") ||
        a.name === "Naruto" ||
        a.name === "Natsu" ||
        a.name === "Gon" ||
        a.name === "Elena"
    ) ?? activeWayData?.agents?.[1];
  const qaAgent =
    activeWayData?.agents?.find(
      (a) =>
        a.role.toLowerCase().includes("qa") ||
        a.name === "Shikamaru" ||
        a.name === "Thomas"
    ) ?? activeWayData?.agents?.[activeWayData.agents.length - 1];

  // Detect tool calls or build/relay execution
  const hasToolOrBuild = message.parts?.some(
    (p) =>
      p.type.startsWith("tool-") ||
      (p.type === "text" &&
        (p.text.includes("Plan enregistré") ||
          p.text.includes("Chef d'escouade") ||
          p.text.includes("Build complete") ||
          p.text.includes("l'escouade prend le relais") ||
          p.text.includes("relais au Chef") ||
          p.text.includes("Naruto")))
  );

  // Relay handoff:
  // - While building/coding: Builder (Naruto) is actively on the front line!
  // - When finished building: QA (Shikamaru) delivers final validation!
  // - In conversation & plan definition: Alvin (Messenger) frames the mission.
  const activeAgent = hasToolOrBuild
    ? isLoading
      ? (builderAgent ?? chiefAgent ?? alvinMessenger)
      : (qaAgent ?? chiefAgent ?? alvinMessenger)
    : alvinMessenger;
  const agentName = activeAgent.name;
  const agentRole = activeAgent.role;
  const agentAvatar = activeAgent.avatarUrl;

  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  const hasAnyContent = message.parts?.some(
    (part) =>
      (part.type === "text" && part.text?.trim().length > 0) ||
      (part.type === "reasoning" &&
        "text" in part &&
        part.text?.trim().length > 0) ||
      part.type.startsWith("tool-")
  );
  const isThinking = isAssistant && isLoading && !hasAnyContent;

  const attachments = attachmentsFromMessage.length > 0 && (
    <div
      className="flex flex-row justify-end gap-2"
      data-testid={"message-attachments"}
    >
      {attachmentsFromMessage.map((attachment) => (
        <PreviewAttachment
          attachment={{
            contentType: attachment.mediaType,
            name:
              attachment.filename ??
              ("name" in attachment && typeof attachment.name === "string"
                ? attachment.name
                : "Fichier"),
            url: attachment.url,
          }}
          key={attachment.url}
        />
      ))}
    </div>
  );

  const mergedReasoning = message.parts?.reduce(
    (acc, part) => {
      if (part.type === "reasoning" && part.text?.trim().length > 0) {
        return {
          isStreaming: "state" in part ? part.state === "streaming" : false,
          rendered: false,
          text: acc.text ? `${acc.text}\n\n${part.text}` : part.text,
        };
      }
      return acc;
    },
    { isStreaming: false, rendered: false, text: "" }
  ) ?? { isStreaming: false, rendered: false, text: "" };

  const parts = message.parts?.map((part, index) => {
    const { type } = part;
    const key = `message-${message.id}-part-${index}`;

    if (type === "reasoning") {
      if (!mergedReasoning.rendered && mergedReasoning.text) {
        mergedReasoning.rendered = true;
        return (
          <MessageReasoning
            isLoading={isLoading || mergedReasoning.isStreaming}
            key={key}
            reasoning={mergedReasoning.text}
          />
        );
      }
      return null;
    }

    if (type === "text") {
      return (
        <ProgressiveTextMessage
          isAssistant={isAssistant}
          isLoading={isLoading}
          key={key}
          text={part.text}
        />
      );
    }

    if (type === "tool-getWeather") {
      const { toolCallId, state } = part;
      const approvalId = (part as { approval?: { id: string } }).approval?.id;
      const isDenied =
        state === "output-denied" ||
        (state === "approval-responded" &&
          (part as { approval?: { approved?: boolean } }).approval?.approved ===
            false);
      const widthClass = "w-[min(100%,450px)]";

      if (state === "output-available") {
        return (
          <div className={widthClass} key={toolCallId}>
            <Weather weatherAtLocation={part.output} />
          </div>
        );
      }

      if (isDenied) {
        return (
          <div className={widthClass} key={toolCallId}>
            <Tool className="w-full" defaultOpen={true}>
              <ToolHeader state="output-denied" type="tool-getWeather" />
              <ToolContent>
                <div className="px-4 py-3 text-muted-foreground text-sm">
                  {t(
                    "chat.toolApproval.weatherDenied",
                    "Recherche météo refusée."
                  )}
                </div>
              </ToolContent>
            </Tool>
          </div>
        );
      }

      if (state === "approval-responded") {
        return (
          <div className={widthClass} key={toolCallId}>
            <Tool className="w-full" defaultOpen={true}>
              <ToolHeader state={state} type="tool-getWeather" />
              <ToolContent>
                <ToolInput input={part.input} />
              </ToolContent>
            </Tool>
          </div>
        );
      }

      return (
        <div className={widthClass} key={toolCallId}>
          <Tool className="w-full" defaultOpen={true}>
            <ToolHeader state={state} type="tool-getWeather" />
            <ToolContent>
              {(state === "input-available" ||
                state === "approval-requested") && (
                <ToolInput input={part.input} />
              )}
              {state === "approval-requested" && approvalId && (
                <ToolApprovalActions
                  addToolApprovalResponse={addToolApprovalResponse}
                  approvalId={approvalId}
                />
              )}
            </ToolContent>
          </Tool>
        </div>
      );
    }

    if (type === "tool-createDocument") {
      const { toolCallId } = part;

      if (part.output && "error" in part.output) {
        return (
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
            key={toolCallId}
          >
            {t("chat.toolApproval.errorCreatingDocument", {
              error: String(part.output.error),
            })}
          </div>
        );
      }

      return (
        <DocumentPreview
          isReadonly={isReadonly}
          key={toolCallId}
          result={part.output}
        />
      );
    }

    if (type === "tool-updateDocument") {
      const { toolCallId } = part;

      if (part.output && "error" in part.output) {
        return (
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
            key={toolCallId}
          >
            {t("chat.toolApproval.errorUpdatingDocument", {
              error: String(part.output.error),
            })}
          </div>
        );
      }

      return (
        <div className="relative" key={toolCallId}>
          <DocumentPreview
            args={{ ...part.output, isUpdate: true }}
            isReadonly={isReadonly}
            result={part.output}
          />
        </div>
      );
    }

    if (type === "tool-requestSuggestions") {
      const { toolCallId, state } = part;

      return (
        <Tool
          className="w-[min(100%,450px)]"
          defaultOpen={true}
          key={toolCallId}
        >
          <ToolHeader state={state} type="tool-requestSuggestions" />
          <ToolContent>
            {state === "input-available" && <ToolInput input={part.input} />}
            {state === "output-available" && (
              <ToolOutput
                errorText={undefined}
                output={
                  "error" in part.output ? (
                    <div className="rounded border p-2 text-red-500">
                      Error: {String(part.output.error)}
                    </div>
                  ) : (
                    <DocumentToolResult
                      isReadonly={isReadonly}
                      result={part.output}
                      type="request-suggestions"
                    />
                  )
                }
              />
            )}
          </ToolContent>
        </Tool>
      );
    }

    return null;
  });

  const handleEdit = useCallback(() => {
    onEdit?.(message);
  }, [onEdit, message]);

  const handleRetry = useCallback(() => {
    regenerate?.();
  }, [regenerate]);

  const actions = !isReadonly && (
    <MessageActions
      chatId={chatId}
      isLoading={isLoading}
      key={`action-${message.id}`}
      message={message}
      onEdit={onEdit ? handleEdit : undefined}
      onRetry={isAssistant ? handleRetry : undefined}
      vote={vote}
    />
  );

  const content = isThinking ? (
    <WaitingText />
  ) : (
    <>
      {attachments}
      {hasMissionActivity && isAssistant && isLoading && (
        <MultiAgentRelay
          currentAgentName={agentName}
          currentWay={currentWay}
          hasToolExecution={hasMissionActivity}
          isFinished={false}
          isLoading={isLoading}
        />
      )}
      {parts}
      {actions}
    </>
  );

  return (
    <div
      className={cn(
        "group/message w-full",
        !isAssistant && "animate-[fade-up_0.25s_cubic-bezier(0.22,1,0.36,1)]"
      )}
      data-role={message.role}
      data-testid={`message-${message.role}`}
    >
      <div
        className={cn(
          isUser ? "flex flex-col items-end gap-2" : "flex items-start gap-3"
        )}
      >
        {isAssistant ? (
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {/* Affichage agent : avatar officiel et nom de la Voie active */}
            <div className="flex items-center gap-2 pt-0.5 flex-wrap">
              <div className="relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sky-500/20 to-violet-500/20 ring-1 ring-sky-400/30">
                {agentAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={agentName}
                    className="size-full object-cover"
                    src={agentAvatar}
                  />
                ) : (
                  <IdealyMark className="size-3.5" size={14} />
                )}
              </div>
              <span className="text-[13px] font-semibold tracking-tight text-foreground/90">
                {agentName}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                • {agentRole}
              </span>
            </div>
            {/* Le texte coule directement sur le fond de l'interface, sans bulle fermée ni bordure artificielle */}
            <div className="min-w-0 flex-1 text-foreground/95">{content}</div>
          </div>
        ) : (
          content
        )}
      </div>
    </div>
  );
};

export const PreviewMessage = PurePreviewMessage;

export const ThinkingMessage = () => {
  // Alvin receives the incoming mission prompt
  const agentAvatar = alvinMessenger.avatarUrl;

  return (
    <div
      className="group/message w-full"
      data-role="assistant"
      data-testid="message-assistant-loading"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-[calc(13px*1.65)] shrink-0 items-center">
          <div className="relative flex size-7 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-sky-500/20 to-violet-500/20 ring-1 ring-sky-400/30 animate-pulse">
            {agentAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Alvin - Messager actif"
                className="size-full object-cover"
                src={agentAvatar}
              />
            ) : (
              <IdealyMark className="size-4" size={16} />
            )}
          </div>
        </div>

        <WaitingText />
      </div>
    </div>
  );
};
