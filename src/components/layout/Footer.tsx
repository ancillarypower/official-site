import { useI18n } from "@/context/I18nContext";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="flex min-h-12 items-center border-t border-border-default bg-surface-raised px-6">
      <div className="flex w-full flex-wrap items-center gap-6">
        <span className="text-[0.725rem] text-tertiary">{t("footer_text")}</span>
        <ul className="ml-auto flex list-none gap-4">
          <li>
            <a
              href="https://developer.woocommerce.com/docs/apis/rest-api/v3/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.725rem] text-tertiary transition-colors hover:text-primary"
            >
              WooCommerce API
            </a>
          </li>
          <li>
            <a
              href="https://threejs.org/docs/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.725rem] text-tertiary transition-colors hover:text-primary"
            >
              Three.js
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
