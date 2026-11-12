import { ArrowLeft, ArrowUp, Check, ChevronDown, ChevronRight, Image as ImageIcon, LayoutGrid, Mic, Paperclip, Plug, Plus, Radio, Square, X } from "lucide-react";
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

type ComposerProps = { placement?: "conversation" | "home" };

export const Composer: React.FC<ComposerProps> = ({ placement = "conversation" }) => {
  const {
    draft, setDraft, sendMessage, stopGeneration, generationStatus,
    setActivePage,
  } = useApp();
  const [modelMode, setModelMode] = useState<"auto" | "discuter" | "construire">(() => {
    try {
      const v = window.localStorage.getItem("idealy.model.mode");
      return v === "discuter" || v === "construire" ? v : "auto";
    } catch {
      return "auto";
    }
  });
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const chooseModel = (mode: "auto" | "discuter" | "construire") => {
    setModelMode(mode);
    setModelMenuOpen(false);
    try {
      window.localStorage.setItem("idealy.model.mode", mode);
    } catch {
      /* stockage indisponible */
    }
  };

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [dictationActive, setDictationActive] = useState(false);
  const [dictationLevel, setDictationLevel] = useState(0);
  const [, setDictationStatus] = useState("");
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [connectorsSubmenuOpen, setConnectorsSubmenuOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const whisperProbe = useRef<boolean | null>(null);
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
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 40), 360)}px`;
  }, [draft]);

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData("text");
    if (text && text.length > 5000) {
      e.preventDefault();
      const docName = `prompt_doc_${Date.now()}.md`;
      const blob = new Blob([text], { type: "text/markdown" });
      const newAttachment: Attachment = {
        id: `att-${Date.now()}`,
        name: docName,
        size: text.length,
        type: "text/markdown",
        url: URL.createObjectURL(blob),
      };
      setAttachments((prev) => [...prev, newAttachment]);
      if (!draft.trim()) {
        setDraft("Consulte le document markdown ci-joint pour les instructions.");
      }
    }
  };

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

  const whisperAvailable = async (): Promise<boolean> => {
    if (typeof MediaRecorder === "undefined") return false;
    if (whisperProbe.current !== null) return whisperProbe.current;
    try {
      const res = await fetch("/api/idealy/transcribe", { credentials: "include" });
      whisperProbe.current = res.ok;
    } catch {
      whisperProbe.current = false;
    }
    return whisperProbe.current;
  };

  const startWhisperDictation = async () => {
    dictationDraftRef.current = draft;
    setDictationStatus("Autorisez le microphone pour commencer…");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setDictationStatus("Accès au microphone refusé. Vérifiez l’autorisation du navigateur.");
      return;
    }
    mediaStreamRef.current = stream;
    startAudioMeter(stream);
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = async () => {
      recorderRef.current = null;
      releaseAudioCapture();
      setDictationActive(false);
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      if (blob.size < 800) {
        setDictationStatus("Aucune voix détectée. Touchez le micro pour réessayer.");
        return;
      }
      setDictationStatus("Transcription…");
      try {
        const body = new FormData();
        body.append("audio", blob, `dictation.${blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm"}`);
        body.append("language", (navigator.language || "fr").slice(0, 2));
        const res = await fetch("/api/idealy/transcribe", { body, credentials: "include", method: "POST" });
        if (!res.ok) throw new Error("transcribe_failed");
        const { text } = (await res.json()) as { text?: string };
        if (text) {
          const current = dictationDraftRef.current;
          const separator = current && !/\s$/.test(current) ? " " : "";
          dictationDraftRef.current = current + separator + text;
          setDraft(dictationDraftRef.current);
          setDictationStatus("");
        } else {
          setDictationStatus("Aucune voix détectée. Touchez le micro pour réessayer.");
        }
      } catch {
        whisperProbe.current = null;
        setDictationStatus("La transcription a échoué. Réessayez.");
      }
    };
    recorder.start();
    setDictationActive(true);
    setDictationStatus("Écoute en cours…");
  };

  const toggleDictation = async () => {
    if (dictationActive && recorderRef.current) {
      setDictationStatus("Transcription…");
      recorderRef.current.stop();
      return;
    }
    if (!dictationActive && navigator.mediaDevices && (await whisperAvailable())) {
      await startWhisperDictation();
      return;
    }
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
    <div className={`composer-dock relative z-10 w-full shrink-0 ${placement === "home" ? "mt-6 px-0 pb-0 pt-0" : "px-3 pb-3 pt-1 sm:px-4"}`}>
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

        <div className={placement === "home" ? "px-5 pt-2 pb-0" : "px-5 pt-4 pb-1"}>
          <textarea
            data-composer-input
            aria-label="Message à Idealy"
            className={`w-full ${placement === "home" ? "min-h-[36px]" : "min-h-[44px]"} max-h-[360px] resize-none overflow-y-auto bg-transparent p-0 text-[15px] leading-6 text-[var(--dsw-alias-label-primary)] placeholder:text-[var(--dsw-alias-label-caption)] focus:outline-none focus:ring-0`}
            enterKeyHint="enter"
            onPaste={handlePaste}
            onChange={(event) => {
              const val = event.target.value;
              if (val.length > 5000) {
                const docName = `prompt_doc_${Date.now()}.md`;
                const blob = new Blob([val], { type: "text/markdown" });
                const newAttachment: Attachment = {
                  id: `att-${Date.now()}`,
                  name: docName,
                  size: val.length,
                  type: "text/markdown",
                  url: URL.createObjectURL(blob),
                };
                setAttachments((prev) => [...prev, newAttachment]);
                setDraft("Consulte le document markdown ci-joint pour les instructions.");
                return;
              }
              if (dictationActive) {
                dictationDraftRef.current = val;
              }
              setDraft(val);
              if (!dictationActive) {
                setDictationStatus("");
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Message à Idealy"
            ref={textareaRef}
            rows={1}
            style={{ caretColor: "var(--idealy-indigo)" }}
            value={draft}
          />
        </div>

        <div className={`flex ${placement === "home" ? "min-h-[44px]" : "min-h-[52px]"} items-center justify-between gap-3 px-3 pb-2 pt-1`}>
          <div className="flex min-w-0 items-center gap-2">
            <input
              aria-label="Choisir des fichiers"
              className="hidden"
              multiple
              onChange={handleFileChange}
              ref={fileInputRef}
              type="file"
            />
            <input
              accept="image/*"
              aria-label="Choisir des photos"
              className="hidden"
              multiple
              onChange={handleFileChange}
              ref={photoInputRef}
              type="file"
            />
            <div className="relative" ref={addMenuRef}>
              <button
                aria-expanded={addMenuOpen}
                aria-haspopup="dialog"
                aria-label="Ajouter au message"
                className="grid h-9 w-9 sm:h-10 sm:w-10 shrink-0 place-items-center rounded-full text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] transition-all duration-200 active:scale-95 focus-ring"
                onClick={() => {
                  setAddMenuOpen((open) => {
                    if (open) setConnectorsSubmenuOpen(false);
                    return !open;
                  });
                }}
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
                  className="composer-add-menu absolute bottom-[calc(100%+8px)] left-0 z-50 w-[min(280px,calc(100vw-24px))] rounded-2xl border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)] p-2 shadow-[0_12px_32px_rgba(0,0,0,0.32)] animate-scale-in"
                  role="dialog"
                >
                  {!connectorsSubmenuOpen ? (
                    <>
                      <p className="composer-add-heading">Ajouter</p>
                      <button className="composer-add-row" onClick={() => { setAddMenuOpen(false); fileInputRef.current?.click(); }} type="button">
                        <Paperclip aria-hidden="true" />
                        <span>Fichier</span>
                      </button>
                      <button className="composer-add-row" onClick={() => { setAddMenuOpen(false); photoInputRef.current?.click(); }} type="button">
                        <ImageIcon aria-hidden="true" />
                        <span>Photo</span>
                      </button>
                      <button
                        className="composer-add-row"
                        onClick={() => setConnectorsSubmenuOpen(true)}
                        onMouseEnter={() => setConnectorsSubmenuOpen(true)}
                        type="button"
                      >
                        <Plug aria-hidden="true" className="text-violet-400" />
                        <span className="flex-1 text-left">Connecteurs</span>
                        <ChevronRight className="h-3.5 w-3.5 text-text-muted" />
                      </button>
                      <button className="composer-add-row" onClick={() => { setAddMenuOpen(false); setActivePage("library"); }} type="button">
                        <LayoutGrid aria-hidden="true" />
                        <span>Bibliothèque</span>
                      </button>
                    </>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between pb-1.5 border-b border-[var(--dsw-alias-border-l1)] px-1">
                        <button
                          className="flex items-center gap-1 text-xs text-text-muted hover:text-text-main p-0.5 rounded transition-colors"
                          onClick={() => setConnectorsSubmenuOpen(false)}
                          type="button"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                          <span>Retour</span>
                        </button>
                        <span className="text-[11px] font-semibold text-text-main">Connecteurs actifs</span>
                      </div>

                      <div className="space-y-1 px-0.5">
                        <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-[var(--dsw-alias-bg-layer-1)] text-xs">
                          <span className="font-medium text-text-main">GitHub</span>
                          <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Actif
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-[var(--dsw-alias-bg-layer-1)] text-xs">
                          <span className="font-medium text-text-main">Supabase</span>
                          <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Actif
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-[var(--dsw-alias-bg-layer-1)] text-xs">
                          <span className="font-medium text-text-main">Vercel</span>
                          <span className="text-[10px] text-text-muted font-normal">Disponible</span>
                        </div>
                      </div>

                      <div className="pt-1.5 border-t border-[var(--dsw-alias-border-l1)]">
                        <button
                          className="flex w-full items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold text-[var(--idealy-teal-petrol)] hover:bg-[var(--idealy-teal-bg)]/20 transition-colors"
                          onClick={() => {
                            setAddMenuOpen(false);
                            setConnectorsSubmenuOpen(false);
                            setActivePage("connectors");
                          }}
                          type="button"
                        >
                          <span>Gérer tous les connecteurs</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="relative">
              <button
                aria-expanded={modelMenuOpen}
                aria-haspopup="menu"
                aria-label="Choisir le mode d'action"
                className="flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-medium text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] border border-border-subtle/60 focus-ring"
                onClick={() => setModelMenuOpen((o) => !o)}
                type="button"
              >
                {modelMode === "discuter" ? "Discuter" : modelMode === "construire" ? "Construire" : "Auto"}
                <ChevronDown aria-hidden="true" className="h-3 w-3" />
              </button>
              {modelMenuOpen && (
                <div
                  className="absolute bottom-[calc(100%+8px)] right-0 z-50 w-[240px] rounded-2xl border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)] p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.32)]"
                  role="menu"
                >
                  {([
                    ["auto", "Auto", "Détection intelligente (discute ou construit)"],
                    ["discuter", "Discuter", "Échange & analyse sans lancer de build"],
                    ["construire", "Construire", "Génère du code et crée l'application"],
                  ] as const).map(([key, label, hint]) => (
                    <button className="composer-add-row" key={key} onClick={() => chooseModel(key)} role="menuitemradio" aria-checked={modelMode === key} type="button">
                      <span className="flex flex-1 flex-col text-left">
                        <span className="text-xs font-semibold">{label}</span>
                        <span className="text-[11px] text-[var(--dsw-alias-label-tertiary)]">{hint}</span>
                      </span>
                      {modelMode === key && <Check aria-hidden="true" className="h-4 w-4 text-[var(--idealy-teal-petrol)]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {!isGenerating && (
              <>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("idealy:open-live-voice"))}
                  aria-label="Mode vocal temps réel (Gemini Live)"
                  title="Mode vocal temps réel (Gemini Live)"
                  className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-full text-[var(--dsw-alias-label-secondary)] hover:bg-emerald-500/10 hover:text-emerald-400 transition-all duration-200 active:scale-95 focus-ring"
                >
                  <Radio aria-hidden="true" className="h-4 w-4" />
                </button>
                <button
                  aria-label={
                    dictationActive
                      ? "Arrêter la dictée vocale"
                      : "Dicter avec le microphone"
                  }
                aria-pressed={dictationActive}
                className={
                  dictationActive
                    ? "dictation-button dictation-button-active grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-full bg-[var(--idealy-indigo)] text-white shadow-md transition-all duration-200 active:scale-95 focus-ring"
                    : "dictation-button grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-full text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] transition-all duration-200 active:scale-95 focus-ring"
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
              </>
            )}
            {isGenerating ? (
              <button
                aria-label="Arrêter la réponse"
                className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-full bg-[var(--dsw-alias-state-error-primary)] text-white shadow-sm transition-all duration-200 active:scale-95 focus-ring"
                onClick={stopGeneration}
                title="Arrêter la réponse"
                type="button"
              >
                <Square
                  aria-hidden="true"
                  className="h-4 w-4 fill-current"
                />
              </button>
            ) : !isEmpty ? (
              <button
                aria-label="Envoyer le message"
                className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-gradient-to-tr from-[var(--idealy-teal-petrol)] to-[var(--idealy-indigo)] text-white hover:opacity-95 active:scale-95 transition-all duration-200 shadow-md hover:shadow-lg focus-ring animate-scale-in"
                onClick={handleSend}
                title="Envoyer le message"
                type="button"
              >
                <ArrowUp aria-hidden="true" className="h-4 w-4 stroke-[2.2]" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
