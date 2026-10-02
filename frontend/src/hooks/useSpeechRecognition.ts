import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Speech-to-text with the browser's Web Speech API
 * (`SpeechRecognition` / `webkitSpeechRecognition`).
 * No network request from our side and no extra dependency.
 *
 * Pass `speechLang` from `useI18n()` as `lang` so the recognizer listens in
 * the language the user picked (en-IN, hi-IN or mr-IN).
 */

// The DOM lib that ships with TypeScript has no types for this API yet.
interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: RecognitionAlternative;
}
interface RecognitionResultList {
  readonly length: number;
  [index: number]: RecognitionResult;
}
interface RecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: RecognitionResultList;
}
interface RecognitionErrorEvent extends Event {
  readonly error: string;
}
interface Recognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type RecognitionConstructor = new () => Recognition;

function getRecognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export function speechRecognitionSupported() {
  return getRecognitionConstructor() !== null;
}

export interface SpeechRecognitionOptions {
  /** BCP-47 tag, e.g. "hi-IN". Use `speechLang` from `useI18n()`. */
  lang: string;
  /** Keep listening after a pause. Default false: stop after one phrase. */
  continuous?: boolean;
  /**
   * Called with the final text. In single-phrase mode it fires once, when
   * listening ends; in continuous mode it fires for each finished phrase.
   */
  onResult?: (text: string) => void;
}

export type SpeechRecognitionError =
  | "not-supported"
  | "not-allowed"
  | "no-speech"
  | "audio-capture"
  | "network"
  | "language-not-supported"
  | "unknown";

function normalizeError(code: string): SpeechRecognitionError {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "not-allowed";
    case "no-speech":
    case "audio-capture":
    case "network":
    case "language-not-supported":
      return code;
    default:
      return "unknown";
  }
}

export function useSpeechRecognition({
  lang,
  continuous = false,
  onResult,
}: SpeechRecognitionOptions) {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<SpeechRecognitionError | null>(null);
  const browserSupported = speechRecognitionSupported();

  const recognitionRef = useRef<Recognition | null>(null);
  const finalTextRef = useRef("");
  // Keep the latest callback without restarting the recognizer.
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const stopListening = useCallback(() => {
    // stop() lets the recognizer deliver the last final result before onend.
    recognitionRef.current?.stop();
  }, []);

  const abort = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    recognition.abort();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    finalTextRef.current = "";
    setTranscript("");
  }, []);

  const startListening = useCallback(() => {
    const Constructor = getRecognitionConstructor();
    if (!Constructor) {
      setError("not-supported");
      return;
    }
    abort();

    const recognition = new Constructor();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    finalTextRef.current = "";
    setTranscript("");
    setError(null);

    recognition.onresult = (event) => {
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalTextRef.current = `${finalTextRef.current} ${text}`.trim();
          if (continuous && text.trim()) onResultRef.current?.(text.trim());
        } else {
          interim += text;
        }
      }
      setTranscript(`${finalTextRef.current} ${interim}`.trim());
    };

    recognition.onerror = (event) => {
      // "aborted" is our own abort() call, not a user-facing problem.
      if (event.error !== "aborted") setError(normalizeError(event.error));
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
      const finalText = finalTextRef.current.trim();
      if (!continuous && finalText) onResultRef.current?.(finalText);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      // start() throws if a session is already running.
      recognitionRef.current = null;
      setIsListening(false);
      setError("unknown");
    }
  }, [abort, continuous, lang]);

  // A language switch mid-sentence would mix languages: stop instead.
  useEffect(() => abort, [abort, lang]);

  return {
    transcript,
    isListening,
    error,
    startListening,
    stopListening,
    /** Stop at once and drop what was heard; `onResult` is not called. */
    cancelListening: abort,
    resetTranscript,
    browserSupported,
  };
}
