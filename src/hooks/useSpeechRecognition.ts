import { useState, useEffect, useCallback, useRef } from 'react';

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  onerror: () => void;
};

type BrowserSpeechRecognitionFactory = new () => BrowserSpeechRecognition;

interface UseSpeechRecognitionReturn {
  listening: boolean;
  startDictation: () => void;
  stopDictation: () => void;
  isSupported: boolean;
}

export function useSpeechRecognition(
  onTranscript: (transcript: string) => void,
  language: string = 'fr-FR'
): UseSpeechRecognitionReturn {
  const [listening, setListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  useEffect(() => {
    const browserWindow = window as Window & {
      SpeechRecognition?: BrowserSpeechRecognitionFactory;
      webkitSpeechRecognition?: BrowserSpeechRecognitionFactory;
    };
    const Recognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    setIsSupported(!!Recognition);
  }, []);

  const startDictation = useCallback(() => {
    const browserWindow = window as Window & {
      SpeechRecognition?: BrowserSpeechRecognitionFactory;
      webkitSpeechRecognition?: BrowserSpeechRecognitionFactory;
    };
    const Recognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    
    if (!Recognition) {
      console.warn('Speech recognition not supported');
      return;
    }

    const recognition = new Recognition();
    recognition.lang = language;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim();
      onTranscript(transcript);
    };

    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      console.error('Speech recognition error');
    };

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }, [language, onTranscript]);

  const stopDictation = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    listening,
    startDictation,
    stopDictation,
    isSupported,
  };
}