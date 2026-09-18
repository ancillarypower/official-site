import { Link } from "react-router-dom";
import { useI18n } from "@/context/I18nContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function NotFoundPage() {
  const { t } = useI18n();
  useDocumentTitle("404");

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-6xl font-bold text-accent">404</span>
      <h1 className="mt-4 text-xl font-bold">{t("not_found_title")}</h1>
      <p className="mt-2 text-sm text-secondary">{t("not_found_text")}</p>
      <Link
        to="/"
        className="mt-6 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
      >
        {t("not_found_home")}
      </Link>
    </div>
  );
}
