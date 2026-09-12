import { Link } from "react-router-dom";
import { useI18n } from "@/context/I18nContext";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="flex min-h-12 items-center border-t border-border-default bg-surface-raised px-6">
      <div className="flex w-full flex-wrap items-center gap-6">
        <span className="text-[0.725rem] text-tertiary">{t("footer_text")}</span>
        <ul className="ml-auto flex list-none gap-4">
          <li>
            <Link
              to="/legal"
              className="text-[0.725rem] text-tertiary transition-colors hover:text-primary"
            >
              {t("legal_footer_link")}
            </Link>
          </li>
          <li>
            <a
              href="https://www.ancillarypower.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.725rem] text-tertiary transition-colors hover:text-primary"
            >
              {t("footer_website")}
            </a>
          </li>
          <li>
            <a
              href="mailto:contact@ancillarypower.com"
              className="text-[0.725rem] text-tertiary transition-colors hover:text-primary"
            >
              {t("about_email_value")}
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
