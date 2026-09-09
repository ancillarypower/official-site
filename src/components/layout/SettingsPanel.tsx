import { useI18n } from "@/context/I18nContext";
import { useSettingsStore } from "@/stores/settingsStore";
import { CONTENT_TYPES, PER_PAGE_OPTIONS } from "@/lib/constants";

export function SettingsPanel() {
  const { t } = useI18n();
  const s = useSettingsStore();

  return (
    <>
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-5">
        <h2 className="text-sm font-bold">{t("fetch_title")}</h2>
        <button
          onClick={s.closePanel}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-sunken text-base text-secondary transition-colors hover:bg-border-default"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-secondary">{t("site_url_label")}</span>
          <input type="url" value={s.wpUrl} onChange={(e) => s.setWpUrl(e.target.value)} className="w-full rounded-md border border-border-default bg-surface-base px-3 py-2 text-sm transition-colors focus:border-accent focus:ring-2 focus:ring-accent-subtle focus:outline-none" />
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
            <input type="url" value={s.wooUrl} onChange={(e) => s.setWooUrl(e.target.value)} className="w-full rounded-md border border-border-default bg-surface-base px-3 py-2 text-sm transition-colors focus:border-accent focus:ring-2 focus:ring-accent-subtle focus:outline-none" />
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-secondary">{t("woo_key")}</span>
          <input type="text" value={s.wooKey} onChange={(e) => s.setWooKey(e.target.value)} placeholder="ck_xxx" className="w-full rounded-md border border-border-default bg-surface-base px-3 py-2 text-sm transition-colors focus:border-accent focus:ring-2 focus:ring-accent-subtle focus:outline-none" />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-secondary">{t("woo_secret")}</span>
          <input type="password" value={s.wooSecret} onChange={(e) => s.setWooSecret(e.target.value)} placeholder="cs_xxx" className="w-full rounded-md border border-border-default bg-surface-base px-3 py-2 text-sm transition-colors focus:border-accent focus:ring-2 focus:ring-accent-subtle focus:outline-none" />
        </label>

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
