/**
 * Read text aloud with the browser's built-in Web Speech API.
 * No network request and no extra dependency.
 */

export function speechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Best installed voice for a language tag such as "hi-IN". */
function pickVoice(lang: string) {
  const voices = window.speechSynthesis.getVoices();
  const norm = (value: string) => value.replace("_", "-").toLowerCase();
  const exact = voices.find((voice) => norm(voice.lang) === norm(lang));
  if (exact) return exact;
  const base = lang.split("-")[0].toLowerCase();
  const sameBase = voices.find((voice) => norm(voice.lang).startsWith(base));
  if (sameBase) return sameBase;
  // Marathi voices are rare; Hindi voices read Devanagari well.
  if (base === "mr") {
    return voices.find((voice) => norm(voice.lang).startsWith("hi")) ?? null;
  }
  return null;
}

/**
 * Speak `text`, split into sentences so long summaries are not cut off
 * by browsers that stop after ~15 seconds per utterance.
 */
export function speak(text: string, lang: string, onDone: () => void) {
  if (!speechSupported()) {
    onDone();
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();

  const parts = (text.match(/[^.!?।]+[.!?।]?/g) ?? [])
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    onDone();
    return;
  }

  const voice = pickVoice(lang);
  parts.forEach((part, index) => {
    const utterance = new SpeechSynthesisUtterance(part);
    utterance.lang = voice?.lang ?? lang;
    if (voice) utterance.voice = voice;
    utterance.rate = 0.95;
    if (index === parts.length - 1) {
      utterance.onend = onDone;
      utterance.onerror = onDone;
    }
    synth.speak(utterance);
  });
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel();
}
