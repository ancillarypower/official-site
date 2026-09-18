import { Link } from "react-router-dom";
import { useI18n } from "@/context/I18nContext";

const METRICS = [
  { value: "300+ MW", labelZh: "虛擬電廠聚合量", labelEn: "VPP Aggregation Capacity", icon: "⚡" },
  { value: "100%+", labelZh: "平均執行率", labelEn: "Average Dispatch Rate", icon: "✅" },
  { value: "近 3 億度", labelZh: "年綠電轉供與銷售", labelEn: "Annual Green Energy Traded", icon: "🌿" },
] as const;

const SERVICES = [
  { icon: "⚡", titleKey: "about_service_content", descKey: "about_service_content_desc" },
  { icon: "🌿", titleKey: "about_service_3d", descKey: "about_service_3d_desc" },
  { icon: "🔋", titleKey: "about_service_store", descKey: "about_service_store_desc" },
] as const;

const EXPLORE_ITEMS = [
  { to: "/news", labelKey: "nav_content", descZh: "最新文章與公司消息", descEn: "Latest articles and company updates", icon: "📰" },
  { to: "/models", labelKey: "nav_models", descZh: "上傳並檢視 3D 模型", descEn: "Upload and view 3D models", icon: "🧊" },
  { to: "/store", labelKey: "nav_store", descZh: "瀏覽商品與結帳", descEn: "Browse products and checkout", icon: "🛒" },
  { to: "/about", labelKey: "nav_about", descZh: "了解我們的使命與服務", descEn: "Learn about our mission and services", icon: "💡" },
] as const;

export default function LandingPage() {
  const { lang, t } = useI18n();
  const isZh = lang === "zh";

  return (
    <div className="animate-fade-in mx-auto max-w-4xl space-y-16">
      <section className="space-y-6 text-center">
        <h1 className="text-2xl font-bold md:text-3xl">{isZh ? "打造智慧能源的未來" : "Building the Future of Smart Energy"}</h1>
        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-secondary">
          {isZh ? "安瑟樂威是臺灣首家民間合格電力交易商暨可再生能源售電服務業者，透過自主研發的 AIoT 平台，將企業儲能、需量反應與智慧充電等分散式資源整合為可調度的電網資產。" : "Ancillary Power is Taiwan's first qualified private electricity trader and renewable energy retailer, leveraging our proprietary AIoT platform to aggregate distributed energy resources into dispatchable grid assets."}
        </p>
        <div className="flex justify-center gap-3">
          <Link to="/about" className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover">{isZh ? "了解更多" : "Learn More"}</Link>
          <Link to="/news" className="rounded-lg border border-border-default bg-surface-raised px-5 py-2.5 text-sm font-semibold text-secondary transition-colors hover:border-accent hover:text-accent">{isZh ? "最新消息" : "Latest News"}</Link>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-center text-lg font-semibold">{isZh ? "關鍵數據" : "Key Metrics"}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {METRICS.map(({ value, labelZh, labelEn, icon }) => <div key={value} className="rounded-lg border border-border-default bg-surface-raised p-6 text-center"><span className="text-2xl" aria-hidden="true">{icon}</span><p className="mt-2 text-xl font-bold text-accent">{value}</p><p className="mt-1 text-xs text-secondary">{isZh ? labelZh : labelEn}</p></div>)}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-center text-lg font-semibold">{t("about_services_title")}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {SERVICES.map(({ icon, titleKey, descKey }) => <div key={titleKey} className="rounded-lg border border-border-default bg-surface-raised p-5"><span className="text-2xl" role="img" aria-hidden="true">{icon}</span><h3 className="mt-2 text-sm font-semibold">{t(titleKey)}</h3><p className="mt-1 text-xs leading-relaxed text-secondary">{t(descKey)}</p></div>)}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-center text-lg font-semibold">{isZh ? "探索" : "Explore"}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {EXPLORE_ITEMS.map(({ to, labelKey, descZh, descEn, icon }) => <Link key={to} to={to} className="group rounded-lg border border-border-default bg-surface-raised p-5 transition-colors hover:border-accent"><span className="text-2xl" aria-hidden="true">{icon}</span><h3 className="mt-2 text-sm font-semibold group-hover:text-accent">{t(labelKey)}</h3><p className="mt-1 text-xs text-secondary">{isZh ? descZh : descEn}</p></Link>)}
        </div>
      </section>
    </div>
  );
}
