import { useState, useEffect } from "react";
import { useI18n } from "@/context/I18nContext";
import { useSettingsStore, type Theme } from "@/stores/settingsStore";
import { CONTENT_TYPES, PER_PAGE_OPTIONS } from "@/lib/constants";
import { FontSizeControl } from "@/components/ui/FontSizeControl";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const THEME_OPTIONS: { value: Theme; icon: string }[] = [
  { value: "light", icon: "☀" },
  { value: "sepia", icon: "📜" },
  { value: "dark", icon: "🌙" },
];

/** Debounce delay (ms) for text inputs that feed into API query keys. */
const INPUT_DEBOUNCE_MS = 500;

export function SettingsPanel() {
  const { t } = useI18n();
  const s = useSettingsStore();

  // --- Local state + debounce for text inputs that affect queryKeys ---
  const [localWpUrl, setLocalWpUrl] = useState(s.wpUrl);
  const [localWooKey, setLocalWooKey] = useState(s.wooKey);
  const [localWooSecret, setLocalWooSecret] = useState(s.wooSecret);
  const [localWooUrl, setLocalWooUrl] = useState(s.wooUrl);

  // --- Show/hide toggles for credential inputs ---
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const debouncedWpUrl = useDebouncedValue(localWpUrl, INPUT_DEBOUNCE_MS);
  const debouncedWooKey = useDebouncedValue(localWooKey, INPUT_DEBOUNCE_MS);
  const debouncedWooSecret = useDebouncedValue(localWooSecret, INPUT_DEBOUNCE_MS);
  const debouncedWooUrl = useDebouncedValue(localWooUrl, INPUT_DEBOUNCE_MS);

  useEffect(() => { s.setWpUrl(debouncedWpUrl); }, [debouncedWpUrl]);
  useEffect(() => { s.setWooKey(debouncedWooKey); }, [debouncedWooKey]);
  useEffect(() => { s.setWooSecret(debouncedWooSecret); }, [debouncedWooSecret]);
  useEffect(() => { s.setWooUrl(debouncedWooUrl); }, [debouncedWooUrl]);

  return (
    <>
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-5">
        <h2 className="text-sm font-bold">{t("fetch_title")}</h2>
        <button
          onClick={s.closePanel}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-sunken text-base text-secondary transition-colors hover:bg-border-default"
          aria-label={t("a11y_close")}
          title={t("a11y_close")}
        >
          ✕
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="text-[0.7rem] font-semibold tracking-wide text-tertiary uppercase">
          {t("font_size_section")}
        </div>

        <div className="flex justify-center">
          <FontSizeControl />
        </div>

        <div className="text-[0.7rem] font-semibold tracking-wide text-tertiary uppercase">
          {t("theme_section")}
        </div>

        <div className="flex gap-2" role="radiogroup" aria-label={t("theme_section")}>
          {THEME_OPTIONS.map(({ value, icon }) => (
            <button
              key={value}
              onClick={() => s.setTheme(value)}
              className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                s.theme === value
                  ? "bg-accent text-white"
                  : "bg-surface-sunken text-secondary hover:bg-border-default"
              }`}
              role="radio"
              aria-checked={s.theme === value}
            >
              {icon} {t(`theme_${value}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>

        <div className="mt-1 border-t border-border-subtle pt-3" />

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-secondary">{t("site_url_label")}</span>
          <input type="url" value={localWpUrl} onChange={(e) => setLocalWpUrl(e.target.value)} className="w-full rounded-md border border-border-default bg-surface-base px-3 py-2 text-sm transition-colors focus:border-accent focus:ring-2 focus:ring-accent-subtle focus:outline-none" />
          <span className="text-[0.675rem] text-tertiary">{t("site_url_hint")}</span>
        </label>

        <label className="flex items-center gap-2 text-xs text-secondary">
          <input type="checkbox" checked={s.useProxy} onChange={(e) => s.setUseProxy(e.target.checked)} className="h-4 w-4 accent-accent" />
          {t("fetch_proxy")}
        </label>

        <div className="mt-1 border-t border-border-subtle pt-3 text-[0.7rem] font-semibold tracking-wide text-tertiary uppercase">{t("fetch_wp_section")}</div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-secondary">{t("fetch_type")}</span>
          <select value={s.contentType} onChange={(e) => s.setContentType(e.target.value as typeof s.contentType)} className="w-full rounded-md border border-border-default bg-surface-base px-3 py-2 text-sm">
            {CONTENT_TYPES.map((ct) => (<option key={ct} value={ct}>{t(`type_${ct}` as Parameters<typeof t>[0])}</option>))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-secondary">{t("fetch_per_page")}</span>
          <select value={s.perPage} onChange={(e) => s.setPerPage(Number(e.target.value))} className="w-full rounded-md border border-border-default bg-surface-base px-3 py-2 text-sm">
            {PER_PAGE_OPTIONS.map((n) => (<option key={n} value={n}>{n}</option>))}
          </select>
        </label>

        <div className="mt-1 border-t border-border-subtle pt-3 text-[0.7rem] font-semibold tracking-wide text-tertiary uppercase">{t("woo_section")}</div>

        <label className="flex items-center gap-2 rounded-md bg-surface-sunken p-3 text-xs text-secondary">
          <input type="checkbox" checked={s.wooUseSameUrl} onChange={(e) => s.setWooUseSameUrl(e.target.checked)} className="h-4 w-4 accent-accent" />
          {t("woo_use_same_url")}
        </label>

        {!s.wooUseSameUrl && (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-secondary">{t("woo_url")}</span>
            <input type="url" value={localWooUrl} onChange={(e) => setLocalWooUrl(e.target.value)} className="w-full rounded-md border border-border-default bg-surface-base px-3 py-2 text-sm transition-colors focus:border-accent focus:ring-2 focus:ring-accent-subtle focus:outline-none" />
          </label>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-secondary">{t("woo_key")}</span>
          <div className="relative">
            <input type={showKey ? "text" : "password"} value={localWooKey} onChange={(e) => setLocalWooKey(e.target.value)} placeholder="ck_xxx" className="w-full rounded-md border border-border-default bg-surface-base px-3 py-2 pr-9 text-sm transition-colors focus:border-accent focus:ring-2 focus:ring-accent-subtle focus:outline-none" />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-tertiary hover:text-secondary"
              aria-label={showKey ? t("a11y_hide_key") : t("a11y_show_key")}
              title={showKey ? t("a11y_hide_key") : t("a11y_show_key")}
            >
              {showKey ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-secondary">{t("woo_secret")}</span>
          <div className="relative">
            <input type={showSecret ? "text" : "password"} value={localWooSecret} onChange={(e) => setLocalWooSecret(e.target.value)} placeholder="cs_xxx" className="w-full rounded-md border border-border-default bg-surface-base px-3 py-2 pr-9 text-sm transition-colors focus:border-accent focus:ring-2 focus:ring-accent-subtle focus:outline-none" />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-tertiary hover:text-secondary"
              aria-label={showSecret ? t("a11y_hide_secret") : t("a11y_show_secret")}
              title={showSecret ? t("a11y_hide_secret") : t("a11y_show_secret")}
            >
              {showSecret ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-secondary">{t("woo_per_page")}</span>
          <select value={s.wooPerPage} onChange={(e) => s.setWooPerPage(Number(e.target.value))} className="w-full rounded-md border border-border-default bg-surface-base px-3 py-2 text-sm">
            {PER_PAGE_OPTIONS.map((n) => (<option key={n} value={n}>{n}</option>))}
          </select>
        </label>
      </div>

      <div className="mt-auto border-t border-border-subtle px-5 py-4 text-[0.7rem] leading-relaxed text-tertiary">{t("fetch_footer")}</div>
    </>
  );
}
