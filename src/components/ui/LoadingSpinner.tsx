import { useI18n } from "@/context/I18nContext";

export function LoadingSpinner() {
  const { t } = useI18n();

  return (
    <div
      className="flex min-h-[30vh] items-center justify-center gap-2.5 text-sm text-tertiary"
      role="status"
      aria-label={t("loading")}
    >
      <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:0ms]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:200ms]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:400ms]" />
      <span>{t("loading")}</span>
    </div>
  );
}
