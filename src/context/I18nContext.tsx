import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { zh, type TranslationKey } from "@/i18n/zh";
import { en } from "@/i18n/en";

type Lang = "zh" | "en";

interface I18nContextValue {
  lang: Lang;
  toggleLang: () => void;
  t: (key: TranslationKey, replacements?: Record<string, string | number>) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

const translations: Record<Lang, Record<TranslationKey, string>> = { zh, en };

const LANG_STORAGE_KEY = "ap-lang";

function getInitialLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === "zh" || stored === "en") return stored;
  } catch {
    // localStorage unavailable (e.g. security restrictions)
  }
  return "zh";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(getInitialLang);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-TW" : "en";
  }, [lang]);

  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const next = prev === "zh" ? "en" : "zh";
      try {
        localStorage.setItem(LANG_STORAGE_KEY, next);
      } catch {
        // localStorage unavailable
      }
      return next;
    });
  }, []);

  const t = useCallback(
    (key: TranslationKey, replacements?: Record<string, string | number>) => {
      let str = translations[lang][key] ?? translations.en[key] ?? key;
      if (replacements) {
        for (const [k, v] of Object.entries(replacements)) {
          str = str.replaceAll(`{${k}}`, String(v));
        }
      }
      return str;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, toggleLang, t }), [lang, toggleLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
