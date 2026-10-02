import { useEffect, useState } from "react";

import { useI18n } from "../i18n/LanguageProvider";
import { speak, speechSupported, stopSpeaking } from "../i18n/speech";

/**
 * 🔊 Listen: reads the text from `getText()` aloud in the current
 * language. Press again to stop.
 */
export function ListenButton({ getText }: { getText: () => string }) {
  const { t, speechLang, language } = useI18n();
  const [speaking, setSpeaking] = useState(false);
  const supported = speechSupported();

  // Stop when the language changes or the page unmounts.
  useEffect(() => {
    stopSpeaking();
    setSpeaking(false);
  }, [language]);
  useEffect(() => () => stopSpeaking(), []);

  const toggle = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    speak(getText(), speechLang, () => setSpeaking(false));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!supported}
      aria-pressed={speaking}
      title={
        supported
          ? speaking
            ? t("Reading this page aloud")
            : t("Listen")
          : t("Speech is not supported in this browser")
      }
      className={`glass flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        speaking
          ? "border-crop/60 text-crop"
          : "text-husk hover:border-crop/45 hover:text-crop"
      }`}
    >
      <span aria-hidden className="text-base">
        {speaking ? "⏹" : "🔊"}
      </span>
      {speaking ? t("Stop") : t("Listen")}
    </button>
  );
}
