import { ArrowUp, Mic, Paperclip, Plus, Square, X } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import type { Attachment } from "../../types";

type SpeechResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechResultLike>;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

export const Composer: React.FC = () => {
  const { draft, setDraft, sendMessage, stopGeneration, generationStatus } =
    useApp();

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [dictationActive, setDictationActive] = useState(false);
  const [dictationLevel, setDictationLevel] = useState(0);
  const [dictationStatus, setDictationStatus] = useState("");
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const dictationDraftRef = useRef(draft);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const speechWindow = window as SpeechRecognitionWindow;
  const SpeechRecognition =
    speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

  const isGenerating =
    generationStatus === "receiving" || generationStatus === "sending";
  const isEmpty = draft.trim().length === 0 && attachments.length === 0;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, []);

  useEffect(() => {
    if (!addMenuOpen) {
      return;
    }
    const closeOutside = (event: PointerEvent) => {
      if (!addMenuRef.current?.contains(event.target as Node)) {
        setAddMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      setAddMenuOpen(false);
      addButtonRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [addMenuOpen]);

  const releaseAudioCapture = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    analyserRef.current = null;
    audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
    mediaStreamRef.current = null;
    setDictationLevel(0);
  };

  useEffect(
    () => () => {
      recognitionRef.current?.abort?.();
      recognitionRef.current = null;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      audioContextRef.current?.close().catch(() => undefined);
      mediaStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
    },
    [],
  );

  const handleSend = () => {
    if (isEmpty || isGenerating) {
      return;
    }
    sendMessage(draft, attachments);
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const startAudioMeter = (stream: MediaStream) => {
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) {
      return;
    }

    const context = new AudioContextConstructor();
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.78;
    context.createMediaStreamSource(stream).connect(analyser);
    audioContextRef.current = context;
    analyserRef.current = analyser;

    const samples = new Uint8Array(analyser.fftSize);
    let lastUpdate = 0;
    const sample = (time: number) => {
      const currentAnalyser = analyserRef.current;
      if (!currentAnalyser) {
        return;
      }
      currentAnalyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const value of samples) {
        const normalized = (value - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / samples.length);
      const level = Math.min(1, Math.max(0, (rms - 0.012) * 5.2));
      if (time - lastUpdate > 70) {
        setDictationLevel(level);
        lastUpdate = time;
      }
      animationFrameRef.current = requestAnimationFrame(sample);
    };
    animationFrameRef.current = requestAnimationFrame(sample);
  };

  const toggleDictation = async () => {
    if (dictationActive) {
      setDictationStatus("Arrêt de la dictée…");
      recognitionRef.current?.stop();
      releaseAudioCapture();
      setDictationActive(false);
      return;
    }

    if (!SpeechRecognition) {
      setDictationStatus(
        "La dictée vocale n’est pas prise en charge par ce navigateur.",
      );
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setDictationStatus(
        "Le navigateur ne donne pas accès au microphone sur cette page.",
      );
      return;
    }

    dictationDraftRef.current = draft;
    setDictationStatus("Autorisez le microphone pour commencer…");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      const message =
        name === "NotAllowedError" || name === "SecurityError"
          ? "Accès au microphone refusé. Vérifiez l’autorisation du navigateur."
          : name === "NotFoundError"
            ? "Aucun microphone n’a été trouvé."
            : "Impossible d’accéder au microphone. Vérifiez ses autorisations.";
      setDictationStatus(message);
      setDictationActive(false);
      return;
    }

    if (!SpeechRecognition) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
      setDictationStatus(
        "La dictée vocale n’est pas prise en charge par ce navigateur.",
      );
      return;
    }

    mediaStreamRef.current = stream;
    startAudioMeter(stream);

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    setDictationStatus("Écoute en cours…");

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const result = event.results[index];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      const confirmedText = finalText.trim();
      if (confirmedText) {
        const currentDraft = dictationDraftRef.current;
        const separator = currentDraft && !/\s$/.test(currentDraft) ? " " : "";
        dictationDraftRef.current = currentDraft + separator + confirmedText;
        setDraft(dictationDraftRef.current);
      }
      setDictationStatus(
        interimText.trim()
          ? `Dictée : ${interimText.trim()}`
          : "Écoute en cours…",
      );
    };

    recognition.onerror = (event) => {
      const messages: Record<string, string> = {
        "audio-capture": "Aucun microphone utilisable n’a été trouvé.",
        network: "Le service de reconnaissance vocale est indisponible.",
        "no-speech": "Aucune voix détectée. Touchez le micro pour réessayer.",
        "not-allowed":
          "Accès au microphone refusé. Vérifiez l’autorisation du navigateur.",
        "service-not-allowed": "Le navigateur a refusé le service de dictée.",
      };
      setDictationStatus(
        messages[event.error] ?? "La dictée a été interrompue.",
      );
      setDictationActive(false);
      recognitionRef.current = null;
      releaseAudioCapture();
    };

    recognition.onend = () => {
      setDictationActive(false);
      recognitionRef.current = null;
      releaseAudioCapture();
      setDictationStatus((current) =>
        current === "Écoute en cours…" ? "Dictée terminée." : current,
      );
    };

    try {
      await audioContextRef.current?.resume();
      recognition.start();
      setDictationActive(true);
    } catch {
      setDictationStatus("Impossible de démarrer la dictée. Réessayez.");
      setDictationActive(false);
      recognitionRef.current = null;
      releaseAudioCapture();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) {
      return;
    }
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }
    if (window.matchMedia?.("(max-width: 639px)").matches) {
      return;
    }
    event.preventDefault();
    handleSend();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) {
      return;
    }
    const additions: Attachment[] = Array.from(files).map((file) => ({
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
    }));
    setAttachments((current) => [...current, ...additions]);
    event.target.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((current) =>
      current.filter((attachment) => attachment.id !== id),
    );
  };

  return (
    <div className="composer-dock relative z-10 w-full shrink-0 px-3 pb-3 pt-1 sm:px-4">
      <div
        className="composer-card relative mx-auto flex w-full max-w-3xl flex-col rounded-[26px] transition-[border-color,box-shadow,background-color] duration-200"
        data-composer-card
      >
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-3">
            {attachments.map((attachment) => (
              <div
                className="flex max-w-full items-center gap-2 rounded-xl bg-[var(--dsw-alias-interactive-bg-hover)] px-2.5 py-1.5 text-xs text-[var(--dsw-alias-label-primary)]"
                key={attachment.id}
              >
                <Paperclip
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-[var(--idealy-indigo)]"
                />
                <span className="max-w-[180px] truncate font-medium">
                  {attachment.name}
                </span>
                <span className="shrink-0 text-[10px] text-[var(--dsw-alias-label-tertiary)]">
                  {(attachment.size / 1024).toFixed(0)} Ko
                </span>
                <button
                  aria-label={`Retirer ${attachment.name}`}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[var(--dsw-alias-label-tertiary)] hover:bg-[var(--dsw-alias-bg-base)] hover:text-[var(--dsw-alias-state-error-primary)] focus-ring"
                  onClick={() => removeAttachment(attachment.id)}
                  type="button"
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="px-5 pt-4 pb-1">
          <textarea
            aria-label="Message à Idéali"
            className="w-full min-h-[52px] max-h-[200px] resize-none overflow-y-auto bg-transparent p-0 text-[15px] leading-6 text-[var(--dsw-alias-label-primary)] placeholder:text-[var(--dsw-alias-label-caption)] focus:outline-none focus:ring-0"
            enterKeyHint="enter"
            onChange={(event) => {
              if (dictationActive) {
                dictationDraftRef.current = event.target.value;
              }
              setDraft(event.target.value);
              if (!dictationActive) {
                setDictationStatus("");
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Message à Idéali"
            ref={textareaRef}
            rows={1}
            style={{ caretColor: "var(--idealy-indigo)" }}
            value={draft}
          />
        </div>

        <div className="flex min-h-[52px] items-center justify-between gap-3 px-3 pb-2.5 pt-1">
          <div className="flex min-w-0 items-center gap-2">
            <input
              aria-label="Choisir des fichiers"
              className="hidden"
              multiple
              onChange={handleFileChange}
              ref={fileInputRef}
              type="file"
            />
            <div className="relative" ref={addMenuRef}>
              <button
                aria-expanded={addMenuOpen}
                aria-haspopup="dialog"
                aria-label="Ajouter au message"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] transition-colors focus-ring"
                onClick={() => setAddMenuOpen((open) => !open)}
                ref={addButtonRef}
                title="Ajouter au message"
                type="button"
              >
                <Plus
                  aria-hidden="true"
                  className={
                    "h-[18px] w-[18px] transition-transform duration-200 " +
                    (addMenuOpen ? "rotate-45" : "")
                  }
                />
              </button>

              {addMenuOpen && (
                <section
                  aria-label="Ajouter au message"
                  className="composer-add-menu absolute bottom-[calc(100%+8px)] left-0 z-50 w-[min(264px,calc(100vw-24px))] rounded-2xl border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)] p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.32)]"
                  role="dialog"
                >
                  <p className="composer-add-heading">Ajouter</p>
                  <button
                    className="composer-add-row"
                    onClick={() => {
                      setAddMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    type="button"
                  >
                    <Paperclip aria-hidden="true" />
                    <span>Ajouter des fichiers</span>
                  </button>
                </section>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {!isGenerating && (
              <button
                aria-label={
                  dictationActive
                    ? "Arrêter la dictée vocale"
                    : "Dicter avec le microphone"
                }
                aria-pressed={dictationActive}
                className={
                  dictationActive
                    ? "dictation-button dictation-button-active grid h-10 w-10 place-items-center rounded-full bg-[var(--idealy-indigo)] text-white transition-colors focus-ring"
                    : "dictation-button grid h-10 w-10 place-items-center rounded-full text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] transition-colors focus-ring"
                }
                data-recording={dictationActive || undefined}
                onClick={toggleDictation}
                title={
                  SpeechRecognition
                    ? dictationActive
                      ? "Arrêter la dictée"
                      : "Dicter"
                    : "Dictée indisponible dans ce navigateur"
                }
                type="button"
              >
                {dictationActive ? (
                  <span aria-hidden="true" className="dictation-bars">
                    <i
                      style={{
                        height: `${Math.round(5 + dictationLevel * 13)}px`,
                      }}
                    />
                    <i
                      style={{
                        height: `${Math.round(7 + dictationLevel * 19)}px`,
                      }}
                    />
                    <i
                      style={{
                        height: `${Math.round(4 + dictationLevel * 11)}px`,
                      }}
                    />
                    <i
                      style={{
                        height: `${Math.round(6 + dictationLevel * 16)}px`,
                      }}
                    />
                    <i
                      style={{
                        height: `${Math.round(3 + dictationLevel * 9)}px`,
                      }}
                    />
                  </span>
                ) : (
                  <Mic aria-hidden="true" className="h-4 w-4" />
                )}
              </button>
            )}
            {isGenerating ? (
              <button
                aria-label="Arrêter la réponse"
                className="grid h-10 w-10 place-items-center rounded-full bg-[var(--dsw-alias-state-error-primary)] text-white transition-colors focus-ring"
                onClick={stopGeneration}
                title="Arrêter la réponse"
                type="button"
              >
                <Square
                  aria-hidden="true"
                  className="h-3.5 w-3.5 fill-current"
                />
              </button>
            ) : (
              <button
                aria-label="Envoyer le message"
                className={
                  isEmpty
                    ? "grid h-10 w-10 place-items-center rounded-full bg-[var(--dsw-alias-button-info-fill)] text-white opacity-40 cursor-not-allowed transition-colors focus-ring"
                    : "grid h-10 w-10 place-items-center rounded-full bg-[var(--idealy-indigo)] text-white hover:opacity-90 active:scale-95 transition-all focus-ring"
                }
                disabled={isEmpty}
                onClick={handleSend}
                title="Envoyer le message"
                type="button"
              >
                <ArrowUp aria-hidden="true" className="h-4 w-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>

        {dictationStatus && (
          <p
            aria-live="polite"
            className="mx-auto max-w-3xl px-4 pb-2 text-xs text-[var(--dsw-alias-label-secondary)]"
          >
            {dictationStatus}
          </p>
        )}
      </div>
    </div>
  );
};
