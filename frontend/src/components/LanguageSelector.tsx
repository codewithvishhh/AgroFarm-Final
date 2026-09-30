import { LANGUAGES, useI18n, type Language } from "../i18n/LanguageProvider";

/** 🌐 Language picker backed by the shared language state. */
export function LanguageSelector() {
  const { language, setLanguage, t } = useI18n();
  return (
    <label className="glass flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-husk">
      <span aria-hidden>🌐</span>
      <span className="text-moss">{t("Language")}</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as Language)}
        aria-label={t("Language")}
        className="rounded-lg border border-husk/12 bg-canopy/50 px-2 py-1 text-xs text-husk outline-none backdrop-blur focus:border-crop/60"
      >
        {LANGUAGES.map((item) => (
          <option key={item.code} value={item.code}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
