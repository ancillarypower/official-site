import { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useI18n } from "@/context/I18nContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useWooProducts } from "@/hooks/useWooCommerce";
import { useSettingsStore } from "@/stores/settingsStore";
import { ProductGrid } from "@/components/store/ProductGrid";
import { Pagination } from "@/components/ui/Pagination";
import { ContentToolbar } from "@/components/ui/ContentToolbar";
import { SAMPLE_PRODUCTS } from "@/lib/constants";
import { decodeHtml } from "@/lib/utils";
import type { DisplayProduct } from "@/lib/types";

const SORT_OPTIONS = [
  { value: "default", labelKey: "sort_label" },
  { value: "price_asc", labelKey: "sort_price_asc" },
  { value: "price_desc", labelKey: "sort_price_desc" },
  { value: "title_asc", labelKey: "sort_title_asc" },
  { value: "title_desc", labelKey: "sort_title_desc" },
];

function parsePageParam(value: string | null): number {
  const raw = Number(value);
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
}

export default function StorePage() {
  const { t } = useI18n();
  useDocumentTitle(t("nav_store"));
  const wooPerPage = useSettingsStore((s) => s.wooPerPage);
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePageParam(searchParams.get("page"));
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState("default");
  const { data: wooData } = useWooProducts(page);
  const usingSamples = !wooData;

  // Reset page to 1 when wooPerPage changes (not on mount).
  // usePrevious ref pattern: mount -> ref === current -> skip; value change ->
  // ref !== current -> reset page. StrictMode-safe.
  const prevWooPerPage = useRef(wooPerPage);

  useEffect(() => {
    if (prevWooPerPage.current !== wooPerPage) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete("page");
        return next;
      }, { replace: true });
    }
    prevWooPerPage.current = wooPerPage;
  }, [wooPerPage, setSearchParams]);

  const setPage = (p: number) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (p === 1) next.delete("page");
      else next.set("page", String(p));
      return next;
    }, { replace: true });
  };

  const products: DisplayProduct[] = useMemo(() => {
    if (wooData) {
      return wooData.products.map((p) => ({ id: p.id, name: p.name, desc: decodeHtml(p.short_description.replace(/<[^>]*>/g, "")), price: parseFloat(p.price) || 0, regularPrice: parseFloat(p.regular_price) || 0, salePrice: p.sale_price ? parseFloat(p.sale_price) : null, img: p.images[0]?.src ?? null, icon: null, stockStatus: p.stock_status }));
    }
    return SAMPLE_PRODUCTS.map((sp) => ({ id: sp.id, name: t(`product_${sp.id}` as const), desc: t(`product_${sp.id}_desc` as const), price: sp.price, img: null, icon: sp.icon, stockStatus: "instock" }));
  }, [wooData, t]);

  const filteredProducts = useMemo(() => {
    let result = [...products];
    const q = filter.toLowerCase().trim();
    if (q) result = result.filter((p) => p.name.toLowerCase().includes(q));
    switch (sort) {
      case "price_asc": result.sort((a, b) => a.price - b.price); break;
      case "price_desc": result.sort((a, b) => b.price - a.price); break;
      case "title_asc": result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "title_desc": result.sort((a, b) => b.name.localeCompare(a.name)); break;
    }
    return result;
  }, [products, filter, sort]);

  const totalProducts = wooData?.totalProducts ?? SAMPLE_PRODUCTS.length;

  return (
    <div>
      <div className="mb-4 flex items-baseline gap-3 border-b border-border-subtle pb-4">
        <h2 className="text-lg font-bold">{t("store_title")}</h2>
        <span className="text-xs text-tertiary">{t("store_products", { n: totalProducts })}</span>
        {wooData && <span className="rounded bg-[oklch(94%_0.04_155)] px-2 py-0.5 text-[0.65rem] font-semibold text-[oklch(35%_0.12_155)]">\ud83d\udd17 WooCommerce</span>}
      </div>
      <ContentToolbar filterValue={filter} onFilterChange={(v) => { setFilter(v); if (page !== 1) setPage(1); }} sortValue={sort} onSortChange={(v) => { setSort(v); if (page !== 1) setPage(1); }} sortOptions={SORT_OPTIONS} filterPlaceholderKey="store_filter_placeholder" />
      <ProductGrid products={filteredProducts} />
      {!usingSamples && wooData && <Pagination currentPage={page} totalPages={wooData.totalPages} onPageChange={setPage} />}
    </div>
  );
}
