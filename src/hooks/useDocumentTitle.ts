import { useEffect } from "react";
import { useI18n } from "@/context/I18nContext";

/**
 * Sets `document.title` to `"<title> | <brand>"` while the calling
 * component is mounted. Passing an empty string shows only the brand name.
 * The previous title is restored on unmount.
 */
export function useDocumentTitle(title: string): void {
  const { t } = useI18n();
  const brand = t("nav_brand_name");

  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} | ${brand}` : brand;
    return () => {
      document.title = prev;
    };
  }, [title, brand]);
}
