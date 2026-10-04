"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import equal from "fast-deep-equal";
import {
  ArrowUpIcon,
  BrainIcon,
  EyeIcon,
  LibraryIcon,
  Link2Icon,
  LockIcon,
  MicIcon,
  MicOffIcon,
  PlusIcon,
  WrenchIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  type ChangeEvent,
  type Dispatch,
  memo,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { useLocalStorage, useWindowSize } from "usehooks-ts";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import {
  type ChatModel,
  chatModels,
  DEFAULT_CHAT_MODEL,
  type ModelCapabilities,
} from "@/lib/ai/models";
import type { Attachment, ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/provider";
import { useGamificationStore } from "@/lib/stores/use-gamification-store";
import { CHAT_ATTACHMENT_MAX_BYTES } from "@/lib/chat-attachments";
import {
  containsLikelySecret,
  maskLikelySecrets,
  redactLikelySecrets,
} from "@/lib/sensitive-text";
import {
  PromptInput,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuItem,
  PromptInputActionMenuTrigger,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "../ai-elements/prompt-input";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { PaperclipIcon, StopIcon } from "./icons";
import { PreviewAttachment } from "./preview-attachment";
import {
  type SlashCommand,
  SlashCommandMenu,
  slashCommands,
} from "./slash-commands";
import type { VisibilityType } from "./visibility-selector";
import { useVoice } from "@/hooks/use-voice";

function setCookie(name: string, value: string) {
  const maxAge = 60 * 60 * 24 * 365;
  // biome-ignore lint/suspicious/noDocumentCookie: needed for client-side cookie setting
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}`;
}

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  sendMessage,
  className,
  selectedVisibilityType,
  selectedModelId,
  onModelChange,
  editingMessage,
  onCancelEdit,
  isLoading,
}: {
  chatId: string;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  status: UseChatHelpers<ChatMessage>["status"];
  stop: () => void;
  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  messages: UIMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  sendMessage:
    | UseChatHelpers<ChatMessage>["sendMessage"]
    | (() => Promise<void>);
  className?: string;
  selectedVisibilityType: VisibilityType;
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
  editingMessage?: ChatMessage | null;
  onCancelEdit?: () => void;
  isLoading?: boolean;
}) {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const hasLikelySecret = containsLikelySecret(input);
  const inputWordCount = input.trim() ? input.trim().split(/\s+/).length : 0;
  const hasMetadataOnlyAttachments = attachments.some(
    (attachment) =>
      !attachment.contentType.startsWith("image/") &&
      attachment.contentType !== "application/pdf"
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();
  const hasAutoFocused = useRef(false);
  useEffect(() => {
    if (!hasAutoFocused.current && width) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
        hasAutoFocused.current = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [width]);

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    "input",
    ""
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      const finalValue = domValue || localStorageInput || "";
      setInput(finalValue);
    }
  }, [localStorageInput, setInput]);

  useEffect(() => {
    setLocalStorageInput(redactLikelySecrets(input));
  }, [input, setLocalStorageInput]);

  const { language } = useTranslation();
  const { currentWay } = useGamificationStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);
  const [showSensitiveDraft, setShowSensitiveDraft] = useState(false);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashIndex, setSlashIndex] = useState(0);

  // Voice lifecycle via dedicated hook
  const voiceBaseInput = useRef("");
  const voice = useVoice({
    language,
    silenceTimeoutMs: 12_000,
    onInterim: (text) => {
      setShowSensitiveDraft(false);
      const prefix = voiceBaseInput.current.trim();
      setInput(prefix ? `${prefix} ${text}` : text);
    },
    onFinal: (text) => {
      setShowSensitiveDraft(false);
      const prefix = voiceBaseInput.current.trim();
      setInput(prefix ? `${prefix} ${text}` : text);
    },
    onError: (err) => {
      toast(err.message);
    },
  });
  const isListening = voice.state === "listening";

  const toggleSpeechRecognition = useCallback(() => {
    if (voice.state === "idle") {
      voiceBaseInput.current = input;
      voice.start();
    } else {
      voice.stop();
    }
  }, [voice, input]);

  // Listen for command palette voice toggle
  useEffect(() => {
    const handleToggleVoice = () => toggleSpeechRecognition();
    window.addEventListener("idealy:toggle-voice", handleToggleVoice);
    return () =>
      window.removeEventListener("idealy:toggle-voice", handleToggleVoice);
  }, [toggleSpeechRecognition]);

  // Listen for command palette set-chat-input
  useEffect(() => {
    const handleSetInput = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string") {
        setShowSensitiveDraft(false);
        setInput(detail);
        textareaRef.current?.focus();
      }
    };
    window.addEventListener("idealy:set-chat-input", handleSetInput);
    return () =>
      window.removeEventListener("idealy:set-chat-input", handleSetInput);
  }, [setInput]);

  const handleInput = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const val = event.target.value;
      setInput(val);
      setShowSensitiveDraft(false);

      if (val.startsWith("/") && !val.includes(" ")) {
        setSlashOpen(true);
        setSlashQuery(val.slice(1));
        setSlashIndex(0);
      } else {
        setSlashOpen(false);
      }
    },
    [setInput]
  );

  const handleSlashSelect = useCallback(
    (cmd: SlashCommand) => {
      setSlashOpen(false);
      setInput("");
      switch (cmd.action) {
        case "new":
          router.push("/");
          break;
        case "clear":
          toast("Le brouillon a été effacé. L’historique enregistré est conservé.");
          break;
        case "rename":
          toast("Rename is available from the sidebar chat menu.");
          break;
        case "model": {
          const modelBtn = document.querySelector<HTMLButtonElement>(
            "[data-testid='model-selector']"
          );
          modelBtn?.click();
          break;
        }
        case "theme":
          setTheme(resolvedTheme === "dark" ? "light" : "dark");
          break;
        case "delete":
          toast("Delete this chat?", {
            action: {
              label: "Delete",
              onClick: async () => {
                try {
                  const response = await fetch(
                  `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/chat?id=${chatId}`,
                  { method: "DELETE" }
                  );
                  if (!response.ok) throw new Error("delete_failed");
                } catch {
                  toast.error("Impossible de supprimer cette discussion. Réessayez.");
                  return;
                }
                router.push("/");
                toast.success("Discussion supprimée.");
              },
            },
          });
          break;
        case "purge":
          toast("Delete all chats?", {
            action: {
              label: "Delete all",
              onClick: async () => {
                try {
                  const response = await fetch(
                  `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/history`,
                  {
                    method: "DELETE",
                  }
                  );
                  if (!response.ok) throw new Error("delete_failed");
                } catch {
                  toast.error("Impossible de supprimer l’historique. Réessayez.");
                  return;
                }
                router.push("/");
                toast.success("Historique supprimé.");
              },
            },
          });
          break;
        default:
          break;
      }
    },
    [chatId, resolvedTheme, router, setInput, setTheme]
  );

  const submitForm = useCallback(() => {
    const messageText = redactLikelySecrets(input);
    if (messageText !== input) {
      toast.warning("Une clé sensible a été masquée avant l’envoi.");
    }
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
      window.history.pushState(
        {},
        "",
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/chat/${chatId}`
      );
    }

    sendMessage({
      parts: [
        ...attachments.map((attachment) => ({
          filename: attachment.name.slice(0, 255),
          mediaType: attachment.contentType,
          type: "file" as const,
          url: attachment.url,
        })),
        ...(messageText.trim()
          ? [{ text: messageText, type: "text" as const }]
          : []),
      ],
      role: "user",
    });

    setAttachments([]);
    setLocalStorageInput("");
    setInput("");

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    input,
    setInput,
    attachments,
    sendMessage,
    setAttachments,
    setLocalStorageInput,
    width,
    chatId,
  ]);

  const uploadFile = useCallback(async (file: File) => {
    if (file.size > CHAT_ATTACHMENT_MAX_BYTES) {
      toast.error("Ce fichier dépasse la limite de 20 Mo.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/files/upload`,
        {
          body: formData,
          method: "POST",
        }
      );

      if (response.ok) {
        const data = await response.json();
        const { url, contentType } = data;

        return {
          contentType,
          name: file.name,
          url,
        };
      }
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(body?.error ?? "L’importation a échoué. Réessayez.");
    } catch {
      toast.error("Impossible d’importer ce fichier. Vérifiez votre connexion puis réessayez.");
    }
  }, []);

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      const remainingSlots = Math.max(0, 7 - attachments.length - uploadQueue.length);
      const filesToUpload = files.slice(0, remainingSlots);
      if (filesToUpload.length < files.length) {
        toast.error("Un message peut contenir jusqu’à 7 fichiers joints.");
      }
      if (filesToUpload.length === 0) return;
      setUploadQueue(filesToUpload.map((file) => file.name));

      try {
        const uploadPromises = filesToUpload.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch {
        toast.error("Failed to upload files");
      } finally {
        setUploadQueue([]);
      }
    },
    [attachments.length, uploadQueue.length, setAttachments, uploadFile]
  );

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      await handleFiles(Array.from(event.target.files || []));
      event.target.value = "";
    },
    [handleFiles]
  );

  const handlePaste = useCallback(
    async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) {
        return;
      }

      const imageItems = Array.from(items).filter((item) =>
        item.type.startsWith("image/")
      );

      if (imageItems.length === 0) {
        return;
      }

      event.preventDefault();

      const files = imageItems
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);
      await handleFiles(files);
    },
    [handleFiles]
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.addEventListener("paste", handlePaste);
    return () => textarea.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const handleCancelEditMouseDown = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      onCancelEdit?.();
    },
    [onCancelEdit]
  );

  const handleSlashClose = useCallback(() => {
    setSlashOpen(false);
  }, []);

  const handlePromptSubmit = useCallback(() => {
    if (input.startsWith("/")) {
      const query = input.slice(1).trim();
      const cmd = slashCommands.find((c) => c.name === query);
      if (cmd) {
        handleSlashSelect(cmd);
      }
      return;
    }
    if (!input.trim() && attachments.length === 0) {
      return;
    }
    if (status === "ready" || status === "error") {
      submitForm();
    } else {
      toast.error("Please wait for the model to finish its response!");
    }
  }, [attachments.length, handleSlashSelect, input, status, submitForm]);

  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (slashOpen) {
        const filtered = slashCommands.filter((cmd) =>
          cmd.name.startsWith(slashQuery.toLowerCase())
        );
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSlashIndex((i) => Math.min(i + 1, filtered.length - 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSlashIndex((i) => Math.max(i - 1, 0));
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          if (filtered[slashIndex]) {
            handleSlashSelect(filtered[slashIndex]);
          }
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setSlashOpen(false);
          return;
        }
      }
      if (e.key === "Escape" && editingMessage && onCancelEdit) {
        e.preventDefault();
        onCancelEdit();
      }
    },
    [
      editingMessage,
      handleSlashSelect,
      onCancelEdit,
      slashIndex,
      slashOpen,
      slashQuery,
    ]
  );

  return (
    <div className={cn("relative flex w-full flex-col gap-4", className)}>
      {editingMessage && onCancelEdit ? (
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <span>Editing message</span>
          <button
            className="rounded px-1.5 py-0.5 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
            onMouseDown={handleCancelEditMouseDown}
            type="button"
          >
            Cancel
          </button>
        </div>
      ) : null}

      <div className="relative">
        {slashOpen ? (
          <SlashCommandMenu
            onClose={handleSlashClose}
            onSelect={handleSlashSelect}
            query={slashQuery}
            selectedIndex={slashIndex}
          />
        ) : null}
      </div>

      <PromptInput
        className="idealy-prompt-shell relative [&>div]:rounded-2xl [&>div]:border [&>div]:border-border/30 [&>div]:bg-card/70 [&>div]:shadow-[var(--shadow-composer)] [&>div]:transition-shadow [&>div]:duration-300 [&>div]:focus-within:shadow-[var(--shadow-composer-focus)]"
        onFilesDropped={handleFiles}
        onSubmit={handlePromptSubmit}
      >
        {(attachments.length > 0 || uploadQueue.length > 0) && (
          <div
            className="flex w-full self-start flex-row gap-2 overflow-x-auto px-3 pt-3 no-scrollbar"
            data-testid="attachments-preview"
          >
            {attachments.map((attachment) => (
              <AttachmentPreviewItem
                attachment={attachment}
                fileInputRef={fileInputRef}
                key={attachment.url}
                setAttachments={setAttachments}
              />
            ))}

            {uploadQueue.map((filename, index) => (
              <PreviewAttachment
                attachment={{
                  contentType: "",
                  name: filename,
                  url: "",
                }}
                isUploading={true}
                key={`${filename}-${index}`}
              />
            ))}
          </div>
        )}
        {hasMetadataOnlyAttachments ? (
          <p className="px-4 pt-2 text-[11px] leading-relaxed text-muted-foreground" role="status">
            Les fichiers audio, vidéo, archives et formats non reconnus restent joints. Le modèle reçoit leur nom et leur format, mais leur contenu n’est pas encore analysé.
          </p>
        ) : null}
        {hasLikelySecret ? (
          <div className="mx-3 mt-3 flex items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-800 dark:text-amber-200" role="status">
            <span>Clé sensible détectée : elle est masquée à l’écran et le sera aussi avant l’envoi.</span>
            <button
              className="shrink-0 rounded-md px-2 py-1 font-medium underline underline-offset-2"
              onClick={() => setShowSensitiveDraft((visible) => !visible)}
              type="button"
            >
              {showSensitiveDraft ? "Masquer" : "Modifier"}
            </button>
          </div>
        ) : null}
        {input.length > 1200 ? (
          <details className="mx-3 mt-3 overflow-hidden rounded-xl border border-border/60 bg-muted/25 text-xs">
            <summary className="cursor-pointer px-3 py-2.5 font-medium text-foreground/80">
              Aperçu du brief · {inputWordCount} mots · {input.length} caractères
            </summary>
            <div className="border-t border-border/50 px-3 py-3">
              <p className="mb-2 text-muted-foreground">Ce texte sera envoyé comme consigne à l’IA. Les fichiers joints sont transmis séparément ; leur contenu dépend des capacités du modèle sélectionné.</p>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words font-sans leading-relaxed text-foreground/75">{redactLikelySecrets(input)}</pre>
            </div>
          </details>
        ) : null}
        <PromptInputTextarea
          className="min-h-16 max-h-32 text-[13px] leading-relaxed px-4 pt-3 pb-1.5 placeholder:text-muted-foreground/35"
          data-testid="multimodal-input"
          onChange={handleInput}
          onKeyDown={handleTextareaKeyDown}
          placeholder={
            editingMessage
              ? "Modifiez votre message…"
              : "Racontez l’idée que vous voulez transformer…"
          }
          readOnly={hasLikelySecret && !showSensitiveDraft}
          ref={textareaRef}
          value={hasLikelySecret && !showSensitiveDraft ? maskLikelySecrets(input) : input}
        />
        <input
          accept="*/*"
          aria-label="Importer un fichier de 20 Mo maximum"
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <PromptInputFooter className="px-3 pb-3">
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger
                  aria-label="Ajouter des éléments"
                  className="h-7 w-7 rounded-lg border border-border/40 p-1 text-muted-foreground transition-colors hover:border-border hover:bg-muted/60 hover:text-foreground"
                >
                  <PlusIcon className="size-4" />
                </PromptInputActionMenuTrigger>
                <PromptInputActionMenuContent className="w-64 rounded-xl border-border/60 bg-popover/95 p-1.5 shadow-xl backdrop-blur-xl">
                  <PromptInputActionMenuItem
                    className="gap-2 rounded-lg py-2 text-[12px]"
                    title="Tous formats · 20 Mo maximum"
                    onSelect={(event) => {
                      event.preventDefault();
                      fileInputRef.current?.click();
                    }}
                  >
                    <PaperclipIcon size={15} />
                    <span className="flex-1">Joindre des fichiers</span>
                  </PromptInputActionMenuItem>
                  <PromptInputActionMenuItem
                    className="gap-2 rounded-lg py-2 text-[12px]"
                    onSelect={() => router.push("/plugins")}
                  >
                    <Link2Icon className="size-3.5" />
                    <span className="flex-1">Parcourir les connecteurs</span>
                  </PromptInputActionMenuItem>
                  <PromptInputActionMenuItem
                    className="gap-2 rounded-lg py-2 text-[12px]"
                    onSelect={() => router.push("/library")}
                  >
                    <LibraryIcon className="size-3.5" />
                    <span className="flex-1">Ouvrir la bibliothèque</span>
                  </PromptInputActionMenuItem>
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>

              {currentWay && (
                <span
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border transition-colors",
                    currentWay === "ninja" && "bg-red-500/10 border-red-500/20 text-red-500",
                    currentWay === "hunter" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
                    currentWay === "mage" && "bg-blue-500/10 border-blue-500/20 text-blue-500",
                    currentWay === "professional" && "bg-amber-500/10 border-amber-500/20 text-amber-500"
                  )}
                  title={`Voie active : ${currentWay.toUpperCase()}`}
                >
                  <span>
                    {currentWay === "ninja" ? "🥷" : currentWay === "hunter" ? "🏹" : currentWay === "mage" ? "🔮" : "⚡"}
                  </span>
                  <span className="hidden sm:inline capitalize">
                    {currentWay === "professional" ? "Pro" : currentWay}
                  </span>
                </span>
              )}
            </PromptInputTools>

          <div className="flex items-center gap-1.5">
            {isListening ? (
              <span
                aria-live="polite"
                className="flex items-center gap-1.5 px-1 text-[10px] font-medium text-red-500"
              >
                <span className="size-1.5 rounded-full bg-current" />
                <span>Écoute en cours</span>
              </span>
            ) : null}
            <Button
              aria-label={isListening ? "Arrêter la dictée" : "Dicter au micro"}
              aria-pressed={isListening}
              aria-busy={voice.state === "requesting"}
              className={cn(
                "h-8 w-8 rounded-lg border border-border/50 p-1 transition-colors",
                isListening
                  ? "border-red-500/30 bg-red-500/10 text-red-600 hover:bg-red-500/15 dark:text-red-400"
                  : "text-muted-foreground hover:border-border hover:bg-muted/70 hover:text-foreground"
              )}
              disabled={!voice.supported}
              onClick={toggleSpeechRecognition}
              size="icon"
              title={voice.supported ? (isListening ? "Arrêter la dictée" : "Dicter au micro") : "La dictée n’est pas disponible dans ce navigateur."}
              type="button"
              variant="ghost"
            >
              {voice.supported ? <MicIcon className="size-3.5" /> : <MicOffIcon className="size-3.5" />}
            </Button>
            {status === "submitted" ? (
              <StopButton setMessages={setMessages} stop={stop} />
            ) : (
              <PromptInputSubmit
                className={cn(
                  "h-7 w-7 rounded-xl transition-all duration-200",
                  input.trim()
                    ? "bg-foreground text-background hover:opacity-85 active:scale-95"
                    : "bg-muted text-muted-foreground/25 cursor-not-allowed"
                )}
                data-testid="send-button"
                disabled={!input.trim() || uploadQueue.length > 0}
                status={status}
                variant="secondary"
              >
                <ArrowUpIcon className="size-4" />
              </PromptInputSubmit>
            )}
          </div>
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) {
      return false;
    }
    if (prevProps.status !== nextProps.status) {
      return false;
    }
    if (!equal(prevProps.attachments, nextProps.attachments)) {
      return false;
    }
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
      return false;
    }
    if (prevProps.selectedModelId !== nextProps.selectedModelId) {
      return false;
    }
    if (prevProps.editingMessage !== nextProps.editingMessage) {
      return false;
    }
    if (prevProps.isLoading !== nextProps.isLoading) {
      return false;
    }
    if (prevProps.messages.length !== nextProps.messages.length) {
      return false;
    }

    return true;
  }
);

function PureAttachmentPreviewItem({
  attachment,
  fileInputRef,
  setAttachments,
}: {
  attachment: Attachment;
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
}) {
  const handleRemove = useCallback(() => {
    setAttachments((currentAttachments) =>
      currentAttachments.filter((a) => a.url !== attachment.url)
    );
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [attachment.url, fileInputRef, setAttachments]);

  return <PreviewAttachment attachment={attachment} onRemove={handleRemove} />;
}

const AttachmentPreviewItem = memo(PureAttachmentPreviewItem);

function ModelSelectorOption({
  capabilities,
  curated,
  model,
  onModelChange,
  selectedModelId,
  setOpen,
}: {
  capabilities: Record<string, ModelCapabilities> | undefined;
  curated: boolean;
  model: ChatModel;
  onModelChange?: (modelId: string) => void;
  selectedModelId: string;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const [logoProvider] = model.id.split("/");
  const maybeWithTooltip = (icon: ReactNode, label: string) => {
    if (!curated) {
      return icon;
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{icon}</span>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          {label}
        </TooltipContent>
      </Tooltip>
    );
  };
  const handleSelect = useCallback(() => {
    if (!curated) {
      return;
    }
    onModelChange?.(model.id);
    setCookie("chat-model", model.id);
    setOpen(false);
    setTimeout(() => {
      document
        .querySelector<HTMLTextAreaElement>("[data-testid='multimodal-input']")
        ?.focus();
    }, 50);
  }, [curated, model.id, onModelChange, setOpen]);

  const option = (
    <ModelSelectorItem
      aria-disabled={!curated}
      className={cn(
        "flex w-full transition-colors",
        model.id === selectedModelId &&
          "border-b border-dashed border-foreground/50",
        curated
          ? "data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
          : "cursor-not-allowed opacity-40 data-[selected=true]:bg-transparent data-[selected=true]:opacity-60 data-[selected=true]:ring-1 data-[selected=true]:ring-muted-foreground/30 data-[selected=true]:ring-inset"
      )}
      onSelect={handleSelect}
      value={model.id}
    >
      <ModelSelectorLogo provider={logoProvider} />
      <ModelSelectorName>{model.name}</ModelSelectorName>
      <div className="ml-auto flex items-center gap-2 text-foreground/70">
        {capabilities?.[model.id]?.tools
          ? maybeWithTooltip(
              <WrenchIcon className="size-3.5" />,
              "Supports tool use"
            )
          : null}
        {capabilities?.[model.id]?.vision
          ? maybeWithTooltip(
              <EyeIcon className="size-3.5" />,
              "Supports vision"
            )
          : null}
        {capabilities?.[model.id]?.reasoning
          ? maybeWithTooltip(
              <BrainIcon className="size-3.5" />,
              "Supports reasoning"
            )
          : null}
        {!curated && <LockIcon className="size-3 text-muted-foreground/50" />}
      </div>
    </ModelSelectorItem>
  );

  if (curated) {
    return option;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="w-full cursor-not-allowed">{option}</div>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        This model is not available in the demo.
      </TooltipContent>
    </Tooltip>
  );
}

function PureModelSelectorCompact({
  selectedModelId,
  onModelChange,
}: {
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: modelsData } = useSWR(
    `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/models`,
    (url: string) => fetch(url).then((r) => r.json()),
    { dedupingInterval: 3_600_000, revalidateOnFocus: false }
  );

  const capabilities: Record<string, ModelCapabilities> | undefined =
    modelsData?.capabilities ?? modelsData;
  const dynamicModels: ChatModel[] | undefined = modelsData?.models;
  const activeModels = dynamicModels ?? chatModels;

  const selectedModel =
    activeModels.find((m: ChatModel) => m.id === selectedModelId) ??
    activeModels.find((m: ChatModel) => m.id === DEFAULT_CHAT_MODEL) ??
    activeModels[0];
  const [provider] = selectedModel.id.split("/");

  return (
    <ModelSelector onOpenChange={setOpen} open={open}>
      <ModelSelectorTrigger asChild>
        <Button
          className="h-7 max-w-[200px] justify-between gap-1.5 rounded-lg px-2 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
          data-testid="model-selector"
          variant="ghost"
        >
          {provider ? <ModelSelectorLogo provider={provider} /> : null}
          <ModelSelectorName>{selectedModel.name}</ModelSelectorName>
        </Button>
      </ModelSelectorTrigger>
      <ModelSelectorContent commandDefaultValue={selectedModel.id}>
        <ModelSelectorInput placeholder="Search models..." />
        <ModelSelectorList>
          {(() => {
            const curatedIds = new Set(chatModels.map((m) => m.id));
            const allModels = dynamicModels
              ? [
                  ...chatModels,
                  ...dynamicModels.filter((m) => !curatedIds.has(m.id)),
                ]
              : chatModels;

            const grouped: Record<
              string,
              { model: ChatModel; curated: boolean }[]
            > = {};
            for (const model of allModels) {
              const key = curatedIds.has(model.id)
                ? "_available"
                : model.provider;
              if (!grouped[key]) {
                grouped[key] = [];
              }
              grouped[key].push({ curated: curatedIds.has(model.id), model });
            }

            const sortedKeys = Object.keys(grouped).sort((a, b) => {
              if (a === "_available") {
                return -1;
              }
              if (b === "_available") {
                return 1;
              }
              return a.localeCompare(b);
            });

            const providerNames: Record<string, string> = {
              alibaba: "Alibaba",
              anthropic: "Anthropic",
              "arcee-ai": "Arcee AI",
              bytedance: "ByteDance",
              cohere: "Cohere",
              deepseek: "DeepSeek",
              google: "Google",
              inception: "Inception",
              kwaipilot: "Kwaipilot",
              meituan: "Meituan",
              meta: "Meta",
              minimax: "MiniMax",
              mistral: "Mistral",
              moonshotai: "Moonshot",
              morph: "Morph",
              nvidia: "Nvidia",
              openai: "OpenAI",
              perplexity: "Perplexity",
              "prime-intellect": "Prime Intellect",
              xai: "xAI",
              xiaomi: "Xiaomi",
              zai: "Zai",
            };

            return sortedKeys.map((key) => (
              <ModelSelectorGroup
                heading={
                  key === "_available"
                    ? "Available"
                    : (providerNames[key] ?? key)
                }
                key={key}
              >
                {grouped[key].map(({ model, curated }) => (
                  <ModelSelectorOption
                    capabilities={capabilities}
                    curated={curated}
                    key={model.id}
                    model={model}
                    onModelChange={onModelChange}
                    selectedModelId={selectedModel.id}
                    setOpen={setOpen}
                  />
                ))}
              </ModelSelectorGroup>
            ));
          })()}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}

const ModelSelectorCompact = memo(PureModelSelectorCompact);

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
}) {
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      stop();
      setMessages((messages) => messages);
    },
    [setMessages, stop]
  );

  return (
    <Button
      className="h-7 w-7 rounded-xl bg-foreground p-1 text-background transition-all duration-200 hover:opacity-85 active:scale-95 disabled:bg-muted disabled:text-muted-foreground/25 disabled:cursor-not-allowed"
      data-testid="stop-button"
      onClick={handleClick}
    >
      <StopIcon size={14} />
    </Button>
  );
}

const StopButton = memo(PureStopButton);
