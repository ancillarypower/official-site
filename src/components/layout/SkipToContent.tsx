import { useI18n } from "@/context/I18nContext";

export function SkipToContent() {
  const { t } = useI18n();
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-white"
    >
      {t("a11y_skip_to_content")}
    </a>
  );
}
