import { useMemo, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useI18n } from "@/context/I18nContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useWooProducts } from "@/hooks/useWooCommerce";
import { useSettingsStore } from "@/stores/settingsStore";
import { ProductGrid } from "@/components/store/ProductGrid";
import { Pagination } from "@/components/ui/Pagination";
import { ContentToolbar } from "@/components/ui/ContentToolbar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { FetchErrorState } from "@/components/ui/FetchErrorState";
import { SAMPLE_PRODUCTS } from "@/lib/constants";
import { decodeHtml, stripHtml } from "@/lib/utils";
import type { DisplayProduct } from "@/lib/types";

const SORT_OPTIONS = [
  { value: "default", labelKey: "sort_label" },
  { value: "price_asc", labelKey: "sort_price_asc" },
  { value: "price_desc", labelKey: "sort_price_desc" },
  { value: "title_asc", labelKey: "sort_title_asc" },
  { value: "title_desc", labelKey: "sort_title_desc" },
];

/** Default sort parameters matching WooCommerce REST API defaults. */
const DEFAULT_SORT = { orderby: "date", order: "desc" } as const;

/** Map UI sort values to WooCommerce REST API orderby/order parameters (Issue #485). */
const SORT_MAP: Record<string, { orderby: string; order: string }> = {
  default: { orderby: "date", order: "desc" },
  price_asc: { orderby: "price", order: "asc" },
  price_desc: { orderby: "price", order: "desc" },
  title_asc: { orderby: "title", order: "asc" },
  title_desc: { orderby: "title", order: "desc" },
};

function parsePageParam(value: string | null): number {
  const raw = Number(value);
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
}

export default function StorePage() {
  const { t } = useI18n();
  useDocumentTitle(t("nav_store"));
  const wooPerPage = useSettingsStore((s) => s.wooPerPage);
  const baseUrl = useSettingsStore((s) => s.getWooBaseUrl());
  const wooKey = useSettingsStore((s) => s.wooKey);
  const wooSecret = useSettingsStore((s) => s.wooSecret);
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePageParam(searchParams.get("page"));

  // Sync filter and sort to URL search params so they survive navigation
  // and browser refresh (Issue #275). Default values are omitted from URL.
  const filter = searchParams.get("q") ?? "";
  const sort = searchParams.get("sort") ?? "default";

  const setFilter = useCallback((value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set("q", value);
      else next.delete("q");
      next.delete("page");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setSort = useCallback((value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value && value !== "default") next.set("sort", value);
      else next.delete("sort");
      next.delete("page");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Debounce search input before sending to WooCommerce REST API (300 ms).
  const debouncedSearch = useDebouncedValue(filter, 300);

  // Delegate sorting to WooCommerce REST API (Issue #485).
  // Client-side sorting only affected the current page; server-side sorting
  // ensures cross-page consistency. Mirrors ContentPage pattern (Issue #276).
  const sortParams = SORT_MAP[sort] ?? DEFAULT_SORT;

  const { data: wooData, isLoading, isError, error, refetch, isFetching, isPlaceholderData } = useWooProducts(page, debouncedSearch, sortParams.orderby, sortParams.order);
  const usingSamples = !wooData && !isLoading && !isError;

  // Reset page to 1 when wooPerPage or WooCommerce connection settings change
  // (not on mount). Also reset filter and sort when connection settings change.
  // usePrevious ref pattern: mount -> ref === current -> skip;
  // value change -> ref !== current -> reset page. StrictMode-safe.
  const prevWooPerPage = useRef(wooPerPage);
  const prevBaseUrl = useRef(baseUrl);
  const prevWooKey = useRef(wooKey);
  const prevWooSecret = useRef(wooSecret);

  useEffect(() => {
    const perPageChanged = prevWooPerPage.current !== wooPerPage;
    const baseUrlChanged = prevBaseUrl.current !== baseUrl;
    const wooKeyChanged = prevWooKey.current !== wooKey;
    const wooSecretChanged = prevWooSecret.current !== wooSecret;

    if (perPageChanged || baseUrlChanged || wooKeyChanged || wooSecretChanged) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete("page");
        if (baseUrlChanged || wooKeyChanged || wooSecretChanged) {
          next.delete("q");
          next.delete("sort");
        }
        return next;
      }, { replace: true });
    }

    prevWooPerPage.current = wooPerPage;
    prevBaseUrl.current = baseUrl;
    prevWooKey.current = wooKey;
    prevWooSecret.current = wooSecret;
  }, [wooPerPage, baseUrl, wooKey, wooSecret, setSearchParams]);

  const setPage = (p: number) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (p === 1) next.delete("page");
      else next.set("page", String(p));
      return next;
    }, { replace: true });
  };

  const products: DisplayProduct[] = useMemo(() => {
    if (isLoading || isError) return [];
    if (wooData) {
      return wooData.products.map((p) => ({ id: p.id, name: decodeHtml(p.name), desc: stripHtml(p.short_description), price: parseFloat(p.price) || 0, regularPrice: parseFloat(p.regular_price) || 0, salePrice: p.sale_price ? parseFloat(p.sale_price) : null, img: p.images[0]?.src ?? null, icon: null, stockStatus: p.stock_status }));
    }
    return SAMPLE_PRODUCTS.map((sp) => ({ id: sp.id, name: t(`product_${sp.id}` as const), desc: t(`product_${sp.id}_desc` as const), price: sp.price, img: null, icon: sp.icon, stockStatus: "instock" }));
  }, [wooData, t, isLoading, isError]);

  // Server-side sort for WooCommerce products (Issue #485);
  // client-side sort retained only for sample products (no API).
  const displayProducts = useMemo(() => {
    if (wooData) return products; // already sorted by WooCommerce API
    const result = [...products];
    switch (sort) {
      case "price_asc": result.sort((a, b) => a.price - b.price); break;
      case "price_desc": result.sort((a, b) => b.price - a.price); break;
      case "title_asc": result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "title_desc": result.sort((a, b) => b.name.localeCompare(a.name)); break;
    }
    return result;
  }, [products, sort, wooData]);

  const totalProducts = wooData?.totalProducts ?? SAMPLE_PRODUCTS.length;

  return (
    <div>
      <div className="mb-4 flex items-baseline gap-3 border-b border-border-subtle pb-4">
        <h2 className="text-lg font-bold">{t("store_title")}</h2>
        <span className="text-xs text-tertiary">{t("store_products", { n: totalProducts })}</span>
        {wooData && <span className="rounded bg-[oklch(94%_0.04_155)] px-2 py-0.5 text-[0.65rem] font-semibold text-[oklch(35%_0.12_155)]">\uD83D\uDD17 WooCommerce</span>}
        {isFetching && isPlaceholderData && (
          <span className="text-xs text-tertiary animate-pulse">{t("loading")}</span>
        )}
      </div>
      {isLoading ? (
        <LoadingSpinner />
      ) : isError ? (
        <FetchErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <>
          <ContentToolbar filterValue={filter} onFilterChange={setFilter} sortValue={sort} onSortChange={setSort} sortOptions={SORT_OPTIONS} filterPlaceholderKey="store_filter_placeholder" />
          <div className={isFetching && isPlaceholderData ? "opacity-50 transition-opacity" : "transition-opacity"}>
            <ProductGrid products={displayProducts} />
          </div>
          {!usingSamples && wooData && <Pagination currentPage={page} totalPages={wooData.totalPages} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}
