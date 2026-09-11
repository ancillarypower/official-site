import { NavLink, Link, useLocation } from "react-router-dom";
import { useI18n } from "@/context/I18nContext";
import { useSettingsStore } from "@/stores/settingsStore";
import { useCartStore } from "@/stores/cartStore";
import { FontSizeControl } from "@/components/ui/FontSizeControl";

const NAV_ITEMS = [
  { to: "/", labelKey: "nav_content" as const },
  { to: "/models", labelKey: "nav_models" as const },
  { to: "/store", labelKey: "nav_store" as const },
  { to: "/about", labelKey: "nav_about" as const },
];

export function Navbar() {
  const { lang, toggleLang, t } = useI18n();
  const { openPanel } = useSettingsStore();
  const totalItems = useCartStore((s) => s.totalItems());
  const location = useLocation();

  return (
    <nav
      className="sticky top-0 z-50 flex min-h-14 flex-wrap items-center gap-3 border-b border-border-default bg-surface-raised px-5"
      role="navigation"
      aria-label="Main navigation"
    >
      <Link
        to="/"
        className="flex items-center gap-2 text-inherit no-underline"
      >
        <img
          src={`${import.meta.env.BASE_URL}logo.svg`}
          alt=""
          className="h-7 w-auto"
          aria-hidden="true"
        />
        <span className="text-sm font-bold whitespace-nowrap">
          {t("nav_brand_name")}
        </span>
      </Link>

      <div className="h-6 w-px bg-border-default" aria-hidden="true" />

      <ul className="flex list-none gap-1">
        {NAV_ITEMS.map(({ to, labelKey }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `block rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-accent-subtle text-accent"
                    : "text-secondary hover:bg-surface-sunken hover:text-primary"
                }`
              }
              aria-current={location.pathname === to ? "page" : undefined}
            >
              {t(labelKey)}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="hidden h-6 w-px bg-border-default md:block" aria-hidden="true" />

      <div className="hidden md:block">
        <FontSizeControl />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={toggleLang}
          className="rounded-md border border-border-default bg-surface-sunken px-2.5 py-1 text-[0.7rem] font-semibold text-secondary transition-colors hover:border-accent hover:text-accent"
          aria-label="Toggle language"
        >
          {lang === "zh" ? "EN" : "中文"}
        </button>

        <button
          onClick={() => openPanel("cart")}
          className="rounded-md bg-surface-sunken px-3 py-1.5 text-xs font-semibold text-secondary transition-colors hover:bg-border-default hover:text-primary"
          aria-label={t("nav_cart")}
        >
          🛒 {t("nav_cart")}{" "}
          <span className="ml-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-[0.6rem] font-bold text-white">
            {totalItems}
          </span>
        </button>

        <button
          onClick={() => openPanel("settings")}
          className="rounded-md bg-accent px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-hover"
          aria-label={t("nav_settings")}
        >
          ⚙ {t("nav_settings")}
        </button>
      </div>
    </nav>
  );
}
