"use client";

import { motion } from "framer-motion";
import type {
  ErrorInfo,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  PointerEvent as ReactPointerEvent,
} from "react";
import { Component, useCallback, useEffect, useRef, useState } from "react";
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
import { useActiveChat } from "@/hooks/use-active-chat";
import {
  initialArtifactData,
  useArtifact,
  useArtifactSelector,
} from "@/hooks/use-artifact";
import type { Attachment, ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Artifact } from "./artifact";
import { BuildTopBar } from "./build-top-bar";
import { ChatHeader } from "./chat-header";
import { CommandPalette } from "./command-palette";
import { DataStreamHandler } from "./data-stream-handler";
import { submitEditedMessage } from "./message-editor";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";

class ArtifactErrorBoundary extends Component<
  { children: ReactNode },
  { errorMessage?: string; hasError: boolean }
> {
  state: { errorMessage?: string; hasError: boolean } = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Idealy artifact boundary]", error, errorInfo);
    this.setState({ errorMessage: error.message });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center bg-sidebar p-8">
          <div className="w-full max-w-xl rounded-2xl border border-border/60 bg-background p-8 text-center shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Preview
            </p>
            <h2 className="mt-3 text-xl font-semibold">
              Aperçu temporairement indisponible
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Le panneau d’aperçu a rencontré une erreur. Vous pouvez réessayer
              ou poursuivre la mission dans le chat.
            </p>
            {this.state.errorMessage ? (
              <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-left text-xs text-destructive">
                {this.state.errorMessage}
              </p>
            ) : null}
            <button
              className="mt-5 min-h-10 rounded-xl bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() =>
                this.setState({ errorMessage: undefined, hasError: false })
              }
              type="button"
            >
              Réessayer l’aperçu
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ChatShell({ initialPrompt }: { initialPrompt?: string }) {
  const {
    chatId,
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    addToolApprovalResponse,
    input,
    setInput,
    visibilityType,
    isReadonly,
    isLoading,
    votes,
    currentModelId,
    setCurrentModelId,
    showCreditCardAlert,
    setShowCreditCardAlert,
  } = useActiveChat();

  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(
    null
  );
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);
  const { setArtifact } = useArtifact();
  const [chatPaneWidth, setChatPaneWidth] = useState(33);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef({ startWidth: 33, x: 0 });

  const stopRef = useRef(stop);
  stopRef.current = stop;

  const prevChatIdRef = useRef(chatId);
  const initialPromptAppliedRef = useRef(false);
  useEffect(() => {
    if (!initialPrompt || initialPromptAppliedRef.current) {
      return;
    }
    setInput(initialPrompt);
    initialPromptAppliedRef.current = true;
  }, [initialPrompt, setInput]);

  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      prevChatIdRef.current = chatId;
      stopRef.current();
      setArtifact(initialArtifactData);
      setEditingMessage(null);
      setAttachments([]);
    }
  }, [chatId, setArtifact]);

  const handleEditMessage = useCallback(
    (msg: ChatMessage) => {
      const text = msg.parts
        ?.filter((p) => p.type === "text")
        .map((p) => p.text)
        .join("");
      setInput(text ?? "");
      setEditingMessage(msg);
    },
    [setInput]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
    setInput("");
  }, [setInput]);

  const handleSendEditedMessage = useCallback(async () => {
    if (!editingMessage) {
      return;
    }

    const msg = editingMessage;
    setEditingMessage(null);
    await submitEditedMessage({
      message: msg,
      regenerate,
      setMessages,
      text: input,
    });
    setInput("");
  }, [editingMessage, input, regenerate, setInput, setMessages]);

  const handleResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isArtifactVisible) {
        return;
      }
      event.preventDefault();
      resizeStartRef.current = { startWidth: chatPaneWidth, x: event.clientX };
      setIsResizing(true);
    },
    [chatPaneWidth, isArtifactVisible]
  );

  const handleResizeKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (!isArtifactVisible) {
        return;
      }
      const delta =
        event.key === "ArrowLeft" ? -4 : event.key === "ArrowRight" ? 4 : 0;
      if (!delta) {
        return;
      }
      event.preventDefault();
      setChatPaneWidth((current) =>
        Math.min(65, Math.max(25, current + delta))
      );
    },
    [isArtifactVisible]
  );

  useEffect(() => {
    if (!isResizing) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const delta =
        ((event.clientX - resizeStartRef.current.x) / window.innerWidth) * 100;
      setChatPaneWidth(
        Math.min(65, Math.max(25, resizeStartRef.current.startWidth + delta))
      );
    };
    const handlePointerUp = () => setIsResizing(false);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isResizing]);

  const handleActivateGateway = useCallback(() => {
    window.location.href = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/settings/billing`;
  }, []);

  return (
    <>
      <div className="idealy-app-background relative flex h-dvh w-full flex-col overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-45"
        >
          <motion.div
            animate={{
              scale: [1, 1.08, 0.96, 1],
              x: [0, 30, -15, 0],
              y: [0, 20, 35, 0],
            }}
            className="absolute -left-20 -top-24 size-[28rem] rounded-full bg-sky-400/10 dark:bg-sky-500/10 blur-3xl"
            transition={{
              duration: 18,
              ease: "easeInOut",
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
          <motion.div
            animate={{ x: [0, -20, 25, 0], y: [0, 30, -15, 0] }}
            className="absolute left-[35%] top-[15%] size-72 rounded-full bg-teal-400/8 dark:bg-teal-500/8 blur-3xl"
            transition={{
              delay: -4,
              duration: 21,
              ease: "easeInOut",
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
          <motion.div
            animate={{
              scale: [1, 0.95, 1.05, 1],
              x: [0, 25, -20, 0],
              y: [0, -20, 30, 0],
            }}
            className="absolute right-[10%] top-[6%] size-80 rounded-full bg-violet-400/8 dark:bg-violet-500/10 blur-3xl"
            transition={{
              delay: -8,
              duration: 20,
              ease: "easeInOut",
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
          <motion.div
            animate={{ x: [0, 30, -25, 0], y: [0, -25, 15, 0] }}
            className="absolute -bottom-20 right-[25%] size-80 rounded-full bg-sky-400/8 dark:bg-sky-500/8 blur-3xl"
            transition={{
              delay: -12,
              duration: 22,
              ease: "easeInOut",
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
        </div>
        {isArtifactVisible && <BuildTopBar />}
        <main
          className="relative flex min-h-0 flex-1 flex-row overflow-hidden focus:outline-none"
          id="main-content"
          tabIndex={-1}
        >
          <div
            className={cn(
              "relative z-10 flex min-w-0 flex-col bg-background",
              !isResizing &&
                "transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
            )}
            data-idealy-chat-pane="true"
            style={{ width: isArtifactVisible ? `${chatPaneWidth}%` : "100%" }}
          >
            {!isArtifactVisible && (
              <ChatHeader
                chatId={chatId}
                isReadonly={isReadonly}
                selectedVisibilityType={visibilityType}
              />
            )}

            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
              <Messages
                addToolApprovalResponse={addToolApprovalResponse}
                chatId={chatId}
                isArtifactVisible={isArtifactVisible}
                isLoading={isLoading}
                isReadonly={isReadonly}
                messages={messages}
                onEditMessage={handleEditMessage}
                onSuggestionSelect={setInput}
                regenerate={regenerate}
                selectedModelId={currentModelId}
                selectedVisibilityType={visibilityType}
                sendMessage={sendMessage}
                setMessages={setMessages}
                status={status}
                votes={votes}
              />

              <div className="sticky bottom-0 z-10 w-full border-t-0 bg-background/95 px-3 pt-2 pb-3 backdrop-blur-md md:px-4 md:pb-4">
                <div className="mx-auto flex w-full max-w-3xl gap-2">
                  {!isReadonly && (
                    <MultimodalInput
                      attachments={attachments}
                      chatId={chatId}
                      editingMessage={editingMessage}
                      input={input}
                      isLoading={isLoading}
                      messages={messages}
                      onCancelEdit={handleCancelEdit}
                      onModelChange={setCurrentModelId}
                      selectedModelId={currentModelId}
                      selectedVisibilityType={visibilityType}
                      sendMessage={
                        editingMessage ? handleSendEditedMessage : sendMessage
                      }
                      setAttachments={setAttachments}
                      setInput={setInput}
                      setMessages={setMessages}
                      status={status}
                      stop={stop}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
          {isArtifactVisible ? (
            <div
              aria-label="Redimensionner le chat et la preview"
              aria-valuemax={65}
              aria-valuemin={25}
              aria-valuenow={Math.round(chatPaneWidth)}
              className={cn(
                "idealy-split-divider group relative z-20 hidden w-3 shrink-0 cursor-col-resize touch-none items-center justify-center md:flex",
                isResizing && "is-resizing"
              )}
              onKeyDown={handleResizeKeyDown}
              onPointerDown={handleResizePointerDown}
              role="separator"
              tabIndex={0}
            >
              <span aria-hidden="true" className="idealy-split-divider__grip" />
            </div>
          ) : null}

          <ArtifactErrorBoundary key={chatId}>
            <Artifact
              addToolApprovalResponse={addToolApprovalResponse}
              attachments={attachments}
              chatId={chatId}
              input={input}
              isReadonly={isReadonly}
              messages={messages}
              regenerate={regenerate}
              selectedModelId={currentModelId}
              selectedVisibilityType={visibilityType}
              sendMessage={sendMessage}
              setAttachments={setAttachments}
              setInput={setInput}
              setMessages={setMessages}
              status={status}
              stop={stop}
              votes={votes}
            />
          </ArtifactErrorBoundary>
        </main>
      </div>

      <DataStreamHandler />
      <CommandPalette />

      <AlertDialog
        onOpenChange={setShowCreditCardAlert}
        open={showCreditCardAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activer le moteur Idealy</AlertDialogTitle>
            <AlertDialogDescription>
              La configuration de l’espace doit être finalisée avant de pouvoir
              lancer des missions IA.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleActivateGateway}>
              Activer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
