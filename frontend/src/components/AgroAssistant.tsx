import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  ChevronRight,
  MessageCircle,
  Mic,
  Send,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { useLive } from "../hooks/useLive";
import {
  useSpeechRecognition,
  type SpeechRecognitionError,
} from "../hooks/useSpeechRecognition";
import { useI18n } from "../i18n/LanguageProvider";
import { speak, speechSupported, stopSpeaking } from "../i18n/speech";
import { assistantApi } from "../services/api";

interface Message {
  id: number;
  from: "assistant" | "user";
  text: string;
}

function AssistantText({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      {text.split(/\n+/).map((line, index) => {
        const cleaned = line.replace(/\*\*/g, "").replace(/^#{1,6}\s*/, "");
        const numbered = cleaned.match(/^\s*(\d+)[.)]\s+(.+)/);

        if (numbered) {
          return (
            <div key={`${line}-${index}`} className="flex gap-2">
              <span className="font-semibold text-crop">{numbered[1]}.</span>
              <span>{numbered[2]}</span>
            </div>
          );
        }

        if (cleaned.trim().startsWith("- ")) {
          return (
            <div key={`${line}-${index}`} className="flex gap-2">
              <span className="text-crop">•</span>
              <span>{cleaned.trim().slice(2)}</span>
            </div>
          );
        }

        return cleaned.trim() ? <p key={`${line}-${index}`}>{cleaned}</p> : null;
      })}
    </div>
  );
}

/** Markdown-free text for the speech engine, one sentence per line. */
function toSpeechText(text: string) {
  return text
    .split(/\n+/)
    .map((line) =>
      line
        .replace(/\*\*/g, "")
        .replace(/^#{1,6}\s*/, "")
        .replace(/^\s*[-•]\s+/, "")
        // "1. Do this" reads better as plain sentences.
        .replace(/^\s*\d+[.)]\s+/, "")
        .trim(),
    )
    .filter(Boolean)
    .map((line) => (/[.!?।:]$/.test(line) ? line : `${line}.`))
    .join(" ");
}

const MUTE_KEY = "agrofarm:assistant-muted";

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

const MIC_ERRORS: Record<SpeechRecognitionError, string> = {
  "not-supported":
    "Voice input is not supported in this browser. Try Chrome or Edge.",
  "not-allowed": "Microphone access was blocked. Allow it in the browser settings.",
  "no-speech": "No speech was heard. Tap the microphone and try again.",
  "audio-capture": "No microphone was found on this device.",
  network: "Voice input needs an internet connection.",
  "language-not-supported":
    "Voice input is not available for this language in this browser.",
  unknown: "Voice input stopped unexpectedly. Please try again.",
};

/** Animated bars shown while the microphone is listening. */
function SoundWave() {
  return (
    <span className="flex h-4 items-end gap-[3px]" aria-hidden>
      {[0, 1, 2, 3, 4].map((bar) => (
        <motion.span
          key={bar}
          className="w-[3px] rounded-full bg-rot"
          initial={{ height: 4 }}
          animate={{ height: [4, 14, 6, 12, 4] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            delay: bar * 0.12,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}

const SUGGESTIONS = [
  "What should I focus on today?",
  "Show me the latest shipment risks",
  "How can I reduce spoilage?",
];

export function AgroAssistant() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const { t, speechLang, language } = useI18n();
  const { pushToast } = useLive();

  // ---- Text-to-speech for assistant replies ----
  const [muted, setMuted] = useState(readMuted);
  // submit() is async; read the latest mute choice when the reply lands.
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const speechToken = useRef(0);
  const ttsSupported = speechSupported();

  const stopVoice = useCallback(() => {
    speechToken.current += 1;
    stopSpeaking();
    setSpeakingId(null);
  }, []);

  const readAloud = useCallback(
    (message: Message) => {
      if (!ttsSupported) return;
      // speak() cancels anything already playing; the token ignores the
      // "done" callback of the reply that was cut off.
      const token = ++speechToken.current;
      setSpeakingId(message.id);
      speak(toSpeechText(message.text), speechLang, () => {
        if (speechToken.current === token) setSpeakingId(null);
      });
    },
    [speechLang, ttsSupported],
  );

  const toggleMuted = () => {
    setMuted((current) => {
      const next = !current;
      try {
        localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      } catch {
        /* storage unavailable */
      }
      return next;
    });
    stopVoice();
  };

  // Stop reading when the language changes or the assistant unmounts.
  useEffect(() => stopVoice, [language, stopVoice]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, thinking]);

  function submit(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed || thinking) return;

    const id = Date.now();
    setMessages((current) => [...current, { id, from: "user", text: trimmed }]);
    setDraft("");
    setThinking(true);
    void assistantApi
      .chat([
        ...messages.slice(-19).map(({ from, text }) => ({
          role: from,
          content: text,
        })),
        { role: "user", content: trimmed },
      ])
      .then((answer) => {
        const reply: Message = { id: id + 1, from: "assistant", text: answer };
        setMessages((current) => [...current, reply]);
        if (!mutedRef.current) readAloud(reply);
      })
      .catch((error: unknown) => {
        const detail =
          error instanceof Error
            ? error.message
            : "Please try again later.";
        const reply: Message = {
          id: id + 1,
          from: "assistant",
          text: `AI assistant error: ${detail}`,
        };
        setMessages((current) => [...current, reply]);
      })
      .finally(() => setThinking(false));
  }

  // ---- Speech-to-text for the message box ----
  const voiceInput = useSpeechRecognition({
    lang: speechLang,
    onResult: (text) => {
      setDraft(text);
      void submit(text);
    },
  });
  const { isListening, transcript, error: micError } = voiceInput;

  // Show what is being heard, live, in the text box.
  useEffect(() => {
    if (isListening) setDraft(transcript);
  }, [isListening, transcript]);

  useEffect(() => {
    if (!micError) return;
    pushToast({
      title: t("Voice input"),
      message: t(MIC_ERRORS[micError]),
      tone: micError === "no-speech" ? "info" : "warn",
    });
  }, [micError, pushToast, t]);

  const toggleMic = () => {
    if (isListening) {
      voiceInput.stopListening();
      return;
    }
    if (!voiceInput.browserSupported) {
      pushToast({
        title: t("Voice input"),
        message: t(MIC_ERRORS["not-supported"]),
        tone: "warn",
      });
      return;
    }
    // Do not let the microphone hear the assistant talking.
    stopVoice();
    setDraft("");
    voiceInput.startListening();
  };

  const closePanel = () => {
    voiceInput.cancelListening();
    stopVoice();
    setOpen(false);
  };

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit(draft);
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 sm:bottom-6 sm:right-6">
      {open && (
        <section
          aria-label="AgroFarm assistant"
          className="mb-3 flex h-[min(620px,calc(100vh-7rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-soil-500 bg-soil-800 shadow-2xl shadow-black/40"
        >
          <header className="flex items-center justify-between border-b border-husk/8 bg-canopy/60 px-4 py-3 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-crop/15 text-crop">
                <Bot size={19} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-husk">AgroFarm assistant</h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-moss">
                  <span className="h-1.5 w-1.5 rounded-full bg-crop" />
                  Hosted AI assistant
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleMuted}
                disabled={!ttsSupported}
                aria-pressed={!muted}
                title={
                  !ttsSupported
                    ? t("Speech is not supported in this browser")
                    : muted
                      ? t("Auto-read replies is off")
                      : t("Auto-read replies is on")
                }
                aria-label={muted ? t("Turn on auto-read") : t("Turn off auto-read")}
                className={`rounded-lg p-2 transition-colors hover:bg-soil-700 disabled:cursor-not-allowed disabled:opacity-40 ${
                  muted ? "text-moss hover:text-husk" : "text-crop hover:text-crop"
                }`}
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <button
                type="button"
                onClick={closePanel}
                className="rounded-lg p-2 text-moss transition-colors hover:bg-soil-700 hover:text-husk"
                aria-label="Close assistant"
              >
                <X size={16} />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col justify-end">
                <div className="mb-5 rounded-xl border border-crop/20 bg-crop/5 p-4">
                  <div className="mb-3 flex items-center gap-2 text-crop">
                    <Sparkles size={15} />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                      Quick start
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-husk">
                    Ask me about your supply chain, exceptions, or what deserves attention next.
                  </p>
                </div>
                <div className="space-y-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      type="button"
                      key={suggestion}
                      onClick={() => submit(suggestion)}
                      className="flex w-full items-center justify-between rounded-lg border border-soil-600 px-3 py-2.5 text-left text-xs text-moss transition-colors hover:border-crop/50 hover:text-husk"
                    >
                      {suggestion}
                      <ChevronRight size={14} />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.from === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-5 ${
                        message.from === "user"
                          ? "rounded-br-md bg-crop text-soil-900"
                          : "rounded-bl-md border border-husk/12 bg-canopy/50 backdrop-blur/70 text-husk"
                      }`}
                    >
                      {message.from === "assistant" ? (
                        <>
                          <AssistantText text={message.text} />
                          {ttsSupported && (
                            <div className="mt-2 flex justify-end">
                              <button
                                type="button"
                                onClick={() =>
                                  speakingId === message.id
                                    ? stopVoice()
                                    : readAloud(message)
                                }
                                aria-pressed={speakingId === message.id}
                                aria-label={
                                  speakingId === message.id
                                    ? t("Stop reading")
                                    : t("Read this reply aloud")
                                }
                                title={
                                  speakingId === message.id
                                    ? t("Stop reading")
                                    : t("Read this reply aloud")
                                }
                                className={`flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] transition-colors hover:bg-soil-700 ${
                                  speakingId === message.id
                                    ? "text-crop"
                                    : "text-moss hover:text-husk"
                                }`}
                              >
                                {speakingId === message.id ? (
                                  <Square size={11} />
                                ) : (
                                  <Volume2 size={12} />
                                )}
                                {speakingId === message.id ? t("Stop") : t("Listen")}
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        message.text
                      )}
                    </div>
                  </div>
                ))}
                {thinking && (
                  <div
                    className="flex items-center gap-1.5 text-moss"
                    aria-label="Assistant is thinking"
                  >
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-crop" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-crop [animation-delay:120ms]" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-crop [animation-delay:240ms]" />
                  </div>
                )}
                <div ref={endRef} />
              </div>
            )}
          </div>

          <div className="border-t border-husk/8 bg-canopy/40 p-3 backdrop-blur">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  stopVoice();
                  setMessages([]);
                }}
                className="mb-2 text-[10px] text-moss transition-colors hover:text-husk"
              >
                Clear conversation
              </button>
            )}
            <AnimatePresence>
              {isListening && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  role="status"
                  aria-live="polite"
                  className="mb-2 flex items-center gap-2 rounded-lg border border-rot/30 bg-rot/10 px-3 py-2 text-[11px] text-husk"
                >
                  <SoundWave />
                  <span className="truncate">
                    {transcript ? transcript : t("Listening… speak now")}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <label className="sr-only" htmlFor="assistant-message">Message AgroFarm assistant</label>
              <input
                id="assistant-message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={isListening ? t("Listening…") : t("Ask about operations...")}
                readOnly={isListening}
                className="min-w-0 flex-1 rounded-lg border border-husk/12 bg-soil-800/55 backdrop-blur px-3 py-2.5 text-xs text-husk placeholder:text-moss/70 focus:border-crop/60 focus:outline-none"
              />
              <button
                type="button"
                onClick={toggleMic}
                disabled={thinking && !isListening}
                aria-pressed={isListening}
                aria-label={isListening ? t("Stop voice input") : t("Speak your question")}
                title={
                  !voiceInput.browserSupported
                    ? t(MIC_ERRORS["not-supported"])
                    : isListening
                      ? t("Stop voice input")
                      : t("Speak your question")
                }
                className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  isListening
                    ? "bg-rot text-husk"
                    : "border border-husk/12 bg-soil-700 text-moss hover:border-crop/50 hover:text-crop"
                } ${voiceInput.browserSupported ? "" : "opacity-60"}`}
              >
                {isListening && (
                  <span
                    aria-hidden
                    className="absolute inset-0 animate-ping rounded-lg bg-rot/60"
                  />
                )}
                <span className="relative">
                  {isListening ? <Square size={14} /> : <Mic size={15} />}
                </span>
              </button>
              <button
                type="submit"
                disabled={!draft.trim() || thinking}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-crop text-soil-900 transition-colors hover:bg-crop/90 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send message"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => (open ? closePanel() : setOpen(true))}
        className="ml-auto flex h-12 w-12 items-center justify-center rounded-full bg-crop text-soil-900 shadow-lg shadow-crop/20 transition-transform hover:scale-105 hover:bg-crop/90"
        aria-label={open ? "Close AgroFarm assistant" : "Open AgroFarm assistant"}
        aria-expanded={open}
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </div>
  );
}