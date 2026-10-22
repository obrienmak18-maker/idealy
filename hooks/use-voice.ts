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
  resultIndex: number;
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

function mapErrorKind(event: IdealySpeechRecognitionErrorEvent): VoiceErrorKind | "NO_SPEECH" {
  switch (event.error) {
    case "no-speech":
      return "NO_SPEECH";
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

function getFriendlyErrorMessage(kind: VoiceErrorKind, language: string): string {
  const locale = language.toLowerCase().split("-")[0];
  const messages = {
    fr: {
      PERMISSION_DENIED: "Accès micro refusé. Autorisez le microphone dans les paramètres du navigateur.",
      NETWORK: "La reconnaissance vocale a besoin d’une connexion réseau.",
      NOT_SUPPORTED: "La dictée vocale n’est pas prise en charge ici. Utilisez Chrome, Edge ou Safari.",
      DEFAULT: "La dictée vocale s’est interrompue. Cliquez à nouveau pour reprendre.",
    },
    en: {
      PERMISSION_DENIED: "Microphone access was denied. Allow microphone access in your browser settings.",
      NETWORK: "Speech recognition needs a working network connection.",
      NOT_SUPPORTED: "Speech recognition is not supported here. Try Chrome, Edge or Safari.",
      DEFAULT: "Speech recognition stopped. Click the microphone to try again.",
    },
    es: {
      PERMISSION_DENIED: "Se denegó el acceso al micrófono. Permítelo en la configuración del navegador.",
      NETWORK: "El reconocimiento de voz necesita una conexión de red activa.",
      NOT_SUPPORTED: "Este navegador no admite el reconocimiento de voz. Prueba Chrome, Edge o Safari.",
      DEFAULT: "El reconocimiento de voz se detuvo. Vuelve a pulsar el micrófono para intentarlo.",
    },
  } as const;
  const copy = locale === "en" ? messages.en : locale === "es" ? messages.es : messages.fr;
  switch (kind) {
    case "PERMISSION_DENIED":
      return copy.PERMISSION_DENIED;
    case "NETWORK":
      return copy.NETWORK;
    case "NOT_SUPPORTED":
      return copy.NOT_SUPPORTED;
    default:
      return copy.DEFAULT;
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
      try {
        recognitionRef.current.stop();
      } catch {
        recognitionRef.current.abort();
      }
      recognitionRef.current = null;
    }
    setState("idle");
    setInterim("");
  }, [clearSilenceTimer]);

  const start = useCallback(async () => {
    if (state !== "idle") return;

    const Ctor = getRecognitionConstructor();
    if (!Ctor) {
      onErrorRef.current?.({
        kind: "NOT_SUPPORTED",
        message: getFriendlyErrorMessage("NOT_SUPPORTED", language),
      });
      return;
    }

    setState("requesting");

    // Proactively request mic permission to trigger browser prompt if needed
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Close tracks immediately after permission check
        for (const track of stream.getTracks()) {
          track.stop();
        }
      } catch (mediaErr: any) {
        if (mediaErr?.name === "NotAllowedError" || mediaErr?.name === "PermissionDeniedError") {
          setState("idle");
          onErrorRef.current?.({
            kind: "PERMISSION_DENIED",
            message: getFriendlyErrorMessage("PERMISSION_DENIED", language),
          });
          return;
        }
      }
    }

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
        for (let resultIndex = event.resultIndex; resultIndex < event.results.length; resultIndex += 1) {
          const res = event.results[resultIndex];
          const text = res[0]?.transcript ?? "";
          if (res.isFinal) {
            finalPart += `${text} `;
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
        // "aborted" and "no-speech" are expected quiet events — don't show alarm toast
        if (kind !== "ABORTED" && kind !== "NO_SPEECH") {
          onErrorRef.current?.({
            kind,
            message: getFriendlyErrorMessage(kind, language),
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
