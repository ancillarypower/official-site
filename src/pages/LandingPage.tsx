import { Link } from "react-router-dom";
import { useI18n } from "@/context/I18nContext";
import type { TranslationKey } from "@/i18n/zh";

const METRICS: ReadonlyArray<{ valueKey: TranslationKey; labelKey: TranslationKey; icon: string }> = [
  { valueKey: "landing_metric_vpp_value", labelKey: "landing_metric_vpp_label", icon: "\u26A1" },
  { valueKey: "landing_metric_dispatch_value", labelKey: "landing_metric_dispatch_label", icon: "\u2705" },
  { valueKey: "landing_metric_energy_value", labelKey: "landing_metric_energy_label", icon: "\uD83C\uDF3F" },
];

const SERVICES: ReadonlyArray<{ icon: string; titleKey: TranslationKey; descKey: TranslationKey }> = [
  { icon: "\u26A1", titleKey: "about_service_content", descKey: "about_service_content_desc" },
  { icon: "\uD83C\uDF3F", titleKey: "about_service_3d", descKey: "about_service_3d_desc" },
  { icon: "\uD83D\uDD0B", titleKey: "about_service_store", descKey: "about_service_store_desc" },
];

const EXPLORE_ITEMS: ReadonlyArray<{ to: string; labelKey: TranslationKey; descKey: TranslationKey; icon: string }> = [
  { to: "/news", labelKey: "nav_content", descKey: "landing_explore_news_desc", icon: "\uD83D\uDCF0" },
  { to: "/models", labelKey: "nav_models", descKey: "landing_explore_models_desc", icon: "\uD83E\uDDF6" },
  { to: "/store", labelKey: "nav_store", descKey: "landing_explore_store_desc", icon: "\uD83D\uDED2" },
  { to: "/about", labelKey: "nav_about", descKey: "landing_explore_about_desc", icon: "\uD83D\uDCA1" },
];

export default function LandingPage() {
  const { t } = useI18n();

  return (
    <div className="animate-fade-in mx-auto max-w-4xl space-y-16">
      <section className="space-y-6 text-center">
        <h1 className="text-2xl font-bold md:text-3xl">{t("landing_hero_title")}</h1>
        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-secondary">
          {t("landing_hero_text")}
        </p>
        <div className="flex justify-center gap-3">
          <Link to="/about" className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover">{t("landing_cta_about")}</Link>
          <Link to="/news" className="rounded-lg border border-border-default bg-surface-raised px-5 py-2.5 text-sm font-semibold text-secondary transition-colors hover:border-accent hover:text-accent">{t("landing_cta_news")}</Link>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-center text-lg font-semibold">{t("landing_metrics_title")}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {METRICS.map(({ valueKey, labelKey, icon }) => <div key={valueKey} className="rounded-lg border border-border-default bg-surface-raised p-6 text-center"><span className="text-2xl" aria-hidden="true">{icon}</span><p className="mt-2 text-xl font-bold text-accent">{t(valueKey)}</p><p className="mt-1 text-xs text-secondary">{t(labelKey)}</p></div>)}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-center text-lg font-semibold">{t("about_services_title")}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {SERVICES.map(({ icon, titleKey, descKey }) => <div key={titleKey} className="rounded-lg border border-border-default bg-surface-raised p-5"><span className="text-2xl" role="img" aria-hidden="true">{icon}</span><h3 className="mt-2 text-sm font-semibold">{t(titleKey)}</h3><p className="mt-1 text-xs leading-relaxed text-secondary">{t(descKey)}</p></div>)}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-center text-lg font-semibold">{t("landing_explore_title")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {EXPLORE_ITEMS.map(({ to, labelKey, descKey, icon }) => <Link key={to} to={to} className="group rounded-lg border border-border-default bg-surface-raised p-5 transition-colors hover:border-accent"><span className="text-2xl" aria-hidden="true">{icon}</span><h3 className="mt-2 text-sm font-semibold group-hover:text-accent">{t(labelKey)}</h3><p className="mt-1 text-xs text-secondary">{t(descKey)}</p></Link>)}
        </div>
      </section>
    </div>
  );
}
