"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VoiceState = "idle" | "requesting" | "listening";

export interface UseVoiceOptions {
  /** BCP-47 language tag — defaults to "fr-FR". */
  language?: string;
  /** Auto-stop after this many ms of silence. Default 12 000 ms. */
  silenceTimeoutMs?: number;
  /** Called with intermediate transcriptions. */
  onInterim?: (text: string) => void;
  /** Called when a final transcription is committed. */
  onFinal?: (text: string) => void;
  /** Called on any error. */
  onError?: (error: VoiceError) => void;
}

export type VoiceErrorKind =
  | "NOT_SUPPORTED"
  | "PERMISSION_DENIED"
  | "ABORTED"
  | "NETWORK"
  | "UNKNOWN";

export interface VoiceError {
  kind: VoiceErrorKind;
  message: string;
}

export interface UseVoiceReturn {
  /** Current lifecycle state — never lies. */
  state: VoiceState;
  /** Whether the browser supports the Web Speech API. */
  supported: boolean;
  /** Start listening. No-op if already active. */
  start: () => void;
  /** Stop listening. No-op if already idle. */
  stop: () => void;
  /** Toggle start/stop. */
  toggle: () => void;
  /** Last interim transcript (cleared on final). */
  interim: string;
  /** Last committed final transcript. */
  transcript: string;
}

type SpeechRecognitionResultLike = {
  0?: { transcript?: string };
  isFinal: boolean;
};

type IdealySpeechRecognitionEvent = Event & {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type IdealySpeechRecognitionErrorEvent = Event & {
  error: string;
};

type IdealySpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onend: (() => void) | null;
  onerror: ((event: IdealySpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: IdealySpeechRecognitionEvent) => void) | null;
  onstart: (() => void) | null;
  abort: () => void;
  start: () => void;
  stop: () => void;
};

type IdealySpeechRecognitionConstructor = new () => IdealySpeechRecognition;

// ---------------------------------------------------------------------------
// Language mapping
// ---------------------------------------------------------------------------

const LANG_MAP: Record<string, string> = {
  fr: "fr-FR",
  en: "en-US",
  es: "es-ES",
  de: "de-DE",
  it: "it-IT",
  pt: "pt-BR",
  ja: "ja-JP",
  ko: "ko-KR",
  zh: "zh-CN",
  ar: "ar-SA",
};

function resolveLang(lang: string): string {
  if (lang.includes("-")) return lang;
  return LANG_MAP[lang] ?? `${lang}-${lang.toUpperCase()}`;
}

// ---------------------------------------------------------------------------
// Browser detection
// ---------------------------------------------------------------------------

function getRecognitionConstructor():
  | IdealySpeechRecognitionConstructor
  | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as Window & {
    SpeechRecognition?: IdealySpeechRecognitionConstructor;
    webkitSpeechRecognition?: IdealySpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

function mapErrorKind(event: IdealySpeechRecognitionErrorEvent): VoiceErrorKind {
  switch (event.error) {
    case "not-allowed":
      return "PERMISSION_DENIED";
    case "aborted":
      return "ABORTED";
    case "network":
      return "NETWORK";
    default:
      return "UNKNOWN";
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useVoice(options: UseVoiceOptions = {}): UseVoiceReturn {
  const {
    language = "fr-FR",
    silenceTimeoutMs = 12_000,
    onInterim,
    onFinal,
    onError,
  } = options;

  const [state, setState] = useState<VoiceState>("idle");
  const [interim, setInterim] = useState("");
  const [transcript, setTranscript] = useState("");

  const recognitionRef = useRef<IdealySpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep callbacks stable via refs
  const onInterimRef = useRef(onInterim);
  onInterimRef.current = onInterim;
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const supported =
    typeof window !== "undefined" && !!getRecognitionConstructor();

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      recognitionRef.current?.stop();
    }, silenceTimeoutMs);
  }, [clearSilenceTimer, silenceTimeoutMs]);

  const stop = useCallback(() => {
    clearSilenceTimer();
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setState("idle");
    setInterim("");
  }, [clearSilenceTimer]);

  const start = useCallback(() => {
    if (state !== "idle") return;

    const Ctor = getRecognitionConstructor();
    if (!Ctor) {
      onErrorRef.current?.({
        kind: "NOT_SUPPORTED",
        message: "Web Speech API non disponible dans ce navigateur.",
      });
      return;
    }

    setState("requesting");

    try {
      const recognition = new Ctor();
      recognition.lang = resolveLang(language);
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setState("listening");
        resetSilenceTimer();
      };

      recognition.onresult = (event: IdealySpeechRecognitionEvent) => {
        resetSilenceTimer();
        let finalPart = "";
        let interimPart = "";
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0]?.transcript ?? "";
          if (res.isFinal) {
            finalPart += text + " ";
          } else {
            interimPart += text;
          }
        }
        const trimmedFinal = finalPart.trim();
        const trimmedInterim = interimPart.trim();

        if (trimmedInterim) {
          setInterim(trimmedInterim);
          onInterimRef.current?.(trimmedInterim);
        }
        if (trimmedFinal) {
          setTranscript(trimmedFinal);
          setInterim("");
          onFinalRef.current?.(trimmedFinal);
        }
      };

      recognition.onerror = (event: IdealySpeechRecognitionErrorEvent) => {
        clearSilenceTimer();
        const kind = mapErrorKind(event);
        // "aborted" errors from calling stop() are expected — don't surface them.
        if (kind !== "ABORTED") {
          onErrorRef.current?.({
            kind,
            message: event.error ?? "Erreur de reconnaissance vocale.",
          });
        }
        recognitionRef.current = null;
        setState("idle");
        setInterim("");
      };

      recognition.onend = () => {
        clearSilenceTimer();
        recognitionRef.current = null;
        setState("idle");
        setInterim("");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      onErrorRef.current?.({
        kind: "UNKNOWN",
        message: "Impossible de lancer la reconnaissance vocale.",
      });
      setState("idle");
    }
  }, [state, language, clearSilenceTimer, resetSilenceTimer]);

  const toggle = useCallback(() => {
    if (state === "idle") {
      start();
    } else {
      stop();
    }
  }, [state, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSilenceTimer();
      recognitionRef.current?.abort();
    };
  }, [clearSilenceTimer]);

  return { state, supported, start, stop, toggle, interim, transcript };
}
