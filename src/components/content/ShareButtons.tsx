import { useCallback } from "react";
import { toast } from "sonner";
import { useI18n } from "@/context/I18nContext";

interface ShareButtonsProps {
  url: string;
  title: string;
}

export function ShareButtons({ url, title }: ShareButtonsProps) {
  const { t } = useI18n();

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("share_copied" as const));
    } catch {
      toast.error(t("share_copy_failed" as const));
    }
  }, [url, t]);

  const handleNativeShare = useCallback(async () => {
    try {
      await navigator.share({ title, url });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
    }
  }, [title, url]);

  const supportsNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <section aria-label={t("share_title" as const)} className="mt-10 border-t border-border-subtle pt-6">
      <h2 className="mb-3 text-sm font-semibold text-secondary">
        {t("share_title" as const)}
      </h2>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex items-center gap-1.5 rounded-md bg-surface-sunken px-3 py-1.5 text-sm font-medium text-secondary transition-colors hover:bg-border-default"
        >
          📋 {t("share_copy" as const)}
        </button>

        {supportsNativeShare && (
          <button
            type="button"
            onClick={handleNativeShare}
            className="inline-flex items-center gap-1.5 rounded-md bg-surface-sunken px-3 py-1.5 text-sm font-medium text-secondary transition-colors hover:bg-border-default"
          >
            📤 {t("share_native" as const)}
          </button>
        )}

        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md bg-surface-sunken px-3 py-1.5 text-sm font-medium text-secondary transition-colors hover:bg-border-default"
        >
          {t("share_facebook" as const)}
        </a>

        <a
          href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md bg-surface-sunken px-3 py-1.5 text-sm font-medium text-secondary transition-colors hover:bg-border-default"
        >
          {t("share_x" as const)}
        </a>

        <a
          href={`https://social-plugins.line.me/lineit/share?url=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md bg-surface-sunken px-3 py-1.5 text-sm font-medium text-secondary transition-colors hover:bg-border-default"
        >
          {t("share_line" as const)}
        </a>

        <a
          href={`mailto:?subject=${encodedTitle}&body=${encodedUrl}`}
          className="inline-flex items-center gap-1.5 rounded-md bg-surface-sunken px-3 py-1.5 text-sm font-medium text-secondary transition-colors hover:bg-border-default"
        >
          ✉️ {t("share_email" as const)}
        </a>
      </div>
    </section>
  );
}
