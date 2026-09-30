import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { TRANSLATIONS } from "./translations";

export type Language = "en" | "hi" | "mr";

export const LANGUAGES: { code: Language; label: string; speech: string }[] = [
  { code: "en", label: "English", speech: "en-IN" },
  { code: "hi", label: "हिन्दी", speech: "hi-IN" },
  { code: "mr", label: "मराठी", speech: "mr-IN" },
];

type Vars = Record<string, string | number>;

interface I18nValue {
  language: Language;
  setLanguage: (language: Language) => void;
  /** Translate an English source string; falls back to English. */
  t: (text: string, vars?: Vars) => string;
  /** BCP-47 tag used for speech in the current language. */
  speechLang: string;
}

const STORAGE_KEY = "agrofarm:language";

function readStored(): Language {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "hi" || value === "mr" || value === "en") return value;
  } catch {
    /* storage unavailable */
  }
  return "en";
}

function fill(text: string, vars?: Vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

/** English fallback used when a component renders outside the provider. */
const fallback: I18nValue = {
  language: "en",
  setLanguage: () => undefined,
  t: (text, vars) => fill(text, vars),
  speechLang: "en-IN",
};

const I18nContext = createContext<I18nValue>(fallback);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readStored);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const value = useMemo<I18nValue>(() => {
    const dictionary = language === "en" ? undefined : TRANSLATIONS[language];
    return {
      language,
      setLanguage,
      t: (text, vars) => fill(dictionary?.[text] ?? text, vars),
      speechLang:
        LANGUAGES.find((item) => item.code === language)?.speech ?? "en-IN",
    };
  }, [language, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
