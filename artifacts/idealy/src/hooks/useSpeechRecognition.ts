import { useCallback, useEffect, useRef, useState } from 'react';

type BrowserSpeechRecognitionResult = {
  isFinal: boolean;
  length: number;
  [index: number]: { transcript: string } | undefined;
};

type BrowserSpeechRecognitionResultEvent = {
  resultIndex: number;
  results: ArrayLike<BrowserSpeechRecognitionResult>;
};

type BrowserSpeechRecognitionErrorEvent = {
  error?: string;
};

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: BrowserSpeechRecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
};

type BrowserSpeechRecognitionFactory = new () => BrowserSpeechRecognition;

export type SpeechRecognitionUpdate = {
  finalTranscript: string;
  interimTranscript: string;
};

interface UseSpeechRecognitionReturn {
  listening: boolean;
  startDictation: () => boolean;
  stopDictation: () => void;
  isSupported: boolean;
  error: string | null;
}

function getRecognitionFactory() {
  const browserWindow = window as Window & {
    SpeechRecognition?: BrowserSpeechRecognitionFactory;
    webkitSpeechRecognition?: BrowserSpeechRecognitionFactory;
  };
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition(
  onResult: (update: SpeechRecognitionUpdate) => void,
  language: string = 'fr-FR',
): UseSpeechRecognitionReturn {
  const [listening, setListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    setIsSupported(Boolean(getRecognitionFactory()));
  }, []);

  const stopDictation = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onend = null;
      recognition.onerror = null;
      recognition.stop();
    }
    setListening(false);
  }, []);

  const startDictation = useCallback(() => {
    const Recognition = getRecognitionFactory();
    if (!Recognition || recognitionRef.current) return false;

    const recognition = new Recognition();
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = '';
    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript?.trim() ?? '';
        if (!transcript) continue;
        if (result.isFinal) finalTranscript = `${finalTranscript} ${transcript}`.trim();
        else interimTranscript = `${interimTranscript} ${transcript}`.trim();
      }
      onResultRef.current({ finalTranscript, interimTranscript });
    };
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      setListening(false);
    };
    recognition.onerror = (event) => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
        setListening(false);
      }
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        setError(event.error ?? 'speech-recognition-error');
      }
    };

    recognitionRef.current = recognition;
    setError(null);
    setListening(true);
    try {
      recognition.start();
      return true;
    } catch (startError) {
      recognitionRef.current = null;
      setListening(false);
      setError(startError instanceof Error ? startError.message : 'speech-recognition-start-error');
      return false;
    }
  }, [language]);

  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      if (recognition) {
        recognition.onend = null;
        recognition.onerror = null;
        recognition.stop();
      }
    };
  }, []);

  return {
    listening,
    startDictation,
    stopDictation,
    isSupported,
    error,
  };
}
