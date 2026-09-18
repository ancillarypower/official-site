import { useI18n } from "@/context/I18nContext";
import { useSettingsStore } from "@/stores/settingsStore";

interface FetchErrorStateProps {
  error: unknown;
  onRetry?: () => void;
}

/**
 * Detect whether the error is a network/CORS failure.
 * Browser `fetch()` rejects with a TypeError containing "fetch" or
 * "network" for CORS blocks, DNS failures, and offline conditions.
 */
function isNetworkError(error: unknown): boolean {
  if (!(error instanceof TypeError)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("fetch") || msg.includes("network");
}

/**
 * Extract HTTP status code from error messages shaped like "HTTP 404".
 */
function extractHttpStatus(error: unknown): number | null {
  if (!(error instanceof Error)) return null;
  const match = error.message.match(/HTTP\s+(\d{3})/);
  return match ? Number(match[1]) : null;
}

/**
 * User-friendly error state for WordPress/WooCommerce API fetch failures.
 * Replaces raw error messages with actionable guidance.
 */
export function FetchErrorState({ error, onRetry }: FetchErrorStateProps) {
  const { t } = useI18n();
  const openPanel = useSettingsStore((s) => s.openPanel);

  const network = isNetworkError(error);
  const httpStatus = extractHttpStatus(error);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3.5 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-sunken text-xl">
        {network ? "🌐" : "⚠️"}
      </div>
      <h2 className="text-base font-semibold">
        {network
          ? t("error_fetch_network")
          : httpStatus
            ? t("error_fetch_http", { status: httpStatus })
            : t("error_fetch_network")}
      </h2>
      {network && (
        <p className="max-w-[360px] text-sm text-tertiary">
          {t("error_fetch_network_desc")}
        </p>
      )}
      <div className="flex gap-2">
        {network && (
          <button
            onClick={() => openPanel("settings")}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            {t("nav_settings")}
          </button>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="rounded-md border border-border-default bg-surface-raised px-4 py-2 text-sm font-semibold text-secondary transition-colors hover:border-accent hover:text-accent"
          >
            {t("error_fetch_retry")}
          </button>
        )}
      </div>
    </div>
  );
}
