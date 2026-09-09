import {
  createContext,
  useCallback,
  useContext,
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

const I18nContext = createContext<I18nContextValue | null>(null);

const translations: Record<Lang, Record<TranslationKey, string>> = { zh, en };

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("zh");

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === "zh" ? "en" : "zh"));
  }, []);

  const t = useCallback(
    (key: TranslationKey, replacements?: Record<string, string | number>) => {
      let str = translations[lang][key] ?? translations.en[key] ?? key;
      if (replacements) {
        for (const [k, v] of Object.entries(replacements)) {
          str = str.replace(`{${k}}`, String(v));
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
