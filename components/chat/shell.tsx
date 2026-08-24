"use client";

import { motion } from "framer-motion";
import type {
  ErrorInfo,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
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
            <h2 className="mt-3 text-xl font-semibold">Preview ready</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The generated application will appear here when the build
              finishes.
            </p>
            {this.state.errorMessage ? (
              <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-left text-xs text-destructive">
                {this.state.errorMessage}
              </p>
            ) : null}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ChatShell() {
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
  const [chatPaneWidth, setChatPaneWidth] = useState(40);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef({ startWidth: 40, x: 0 });

  const stopRef = useRef(stop);
  stopRef.current = stop;

  const prevChatIdRef = useRef(chatId);
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
      const delta = event.key === "ArrowLeft" ? -4 : event.key === "ArrowRight" ? 4 : 0;
      if (!delta) {
        return;
      }
      event.preventDefault();
      setChatPaneWidth((current) => Math.min(65, Math.max(25, current + delta)));
    },
    [isArtifactVisible]
  );

  useEffect(() => {
    if (!isResizing) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const delta = ((event.clientX - resizeStartRef.current.x) / window.innerWidth) * 100;
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
    window.open(
      "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card",
      "_blank"
    );
    window.location.href = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/`;
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
              x: [0, 45, -20, 0],
              y: [0, 30, 55, 0],
            }}
            className="absolute -left-24 -top-32 size-[28rem] rounded-full bg-sky-400/10 blur-3xl"
            transition={{
              duration: 18,
              ease: "easeInOut",
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
          <motion.div
            animate={{ x: [0, -30, 35, 0], y: [0, 50, -15, 0] }}
            className="absolute left-[34%] top-[18%] size-72 rounded-full bg-emerald-400/8 blur-3xl"
            transition={{
              delay: -4,
              duration: 21,
              ease: "easeInOut",
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
          <motion.div
            animate={{
              scale: [1, 0.94, 1.06, 1],
              x: [0, 30, -25, 0],
              y: [0, -25, 42, 0],
            }}
            className="absolute right-[14%] top-[8%] size-80 rounded-full bg-teal-400/8 blur-3xl"
            transition={{
              delay: -8,
              duration: 20,
              ease: "easeInOut",
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
          <motion.div
            animate={{ x: [0, 45, -35, 0], y: [0, -35, 15, 0] }}
            className="absolute bottom-[-10rem] left-[28%] size-96 rounded-full bg-yellow-400/8 blur-3xl"
            transition={{
              delay: -12,
              duration: 24,
              ease: "easeInOut",
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
          <motion.div
            animate={{
              scale: [1, 1.05, 0.95, 1],
              x: [0, -35, 30, 0],
              y: [0, 20, -35, 0],
            }}
            className="absolute -bottom-24 -right-20 size-[30rem] rounded-full bg-orange-400/10 blur-3xl"
            transition={{
              delay: -6,
              duration: 19,
              ease: "easeInOut",
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
          <motion.div
            animate={{ x: [0, -25, 25, 0], y: [0, 30, -20, 0] }}
            className="absolute right-[36%] top-[42%] size-64 rounded-full bg-red-400/7 blur-3xl"
            transition={{
              delay: -15,
              duration: 22,
              ease: "easeInOut",
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
        </div>
        {isArtifactVisible && <BuildTopBar />}
        <div className="relative flex min-h-0 flex-1 flex-row overflow-hidden">
          <div
            className={cn(
              "relative z-10 flex min-w-0 flex-col bg-sidebar",
              !isResizing && "transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
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

            <div className="idealy-surface relative flex min-h-0 flex-1 flex-col overflow-hidden md:rounded-tl-[12px] md:border-t md:border-l md:border-border/40">
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

              <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
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

          <ArtifactErrorBoundary>
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
        </div>
      </div>

      <DataStreamHandler />

      <AlertDialog
        onOpenChange={setShowCreditCardAlert}
        open={showCreditCardAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activer le moteur Idealy</AlertDialogTitle>
            <AlertDialogDescription>
              La configuration de l’espace doit être finalisée avant de pouvoir lancer des missions IA.
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
