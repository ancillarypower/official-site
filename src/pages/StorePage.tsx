import { useState, useMemo } from "react";
import { useI18n } from "@/context/I18nContext";
import { useWooProducts } from "@/hooks/useWooCommerce";
import { ProductGrid } from "@/components/store/ProductGrid";
import { Pagination } from "@/components/ui/Pagination";
import { ContentToolbar } from "@/components/ui/ContentToolbar";
import { SAMPLE_PRODUCTS } from "@/lib/constants";
import type { DisplayProduct } from "@/lib/types";

const SORT_OPTIONS = [
  { value: "default", labelKey: "sort_label" },
  { value: "price_asc", labelKey: "sort_price_asc" },
  { value: "price_desc", labelKey: "sort_price_desc" },
  { value: "title_asc", labelKey: "sort_title_asc" },
  { value: "title_desc", labelKey: "sort_title_desc" },
];

export default function StorePage() {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState("default");
  const { data: wooData } = useWooProducts(page);
  const usingSamples = !wooData;

  const products: DisplayProduct[] = useMemo(() => {
    if (wooData) {
      return wooData.products.map((p) => ({ id: p.id, name: p.name, desc: p.short_description.replace(/<[^>]*>/g, ""), price: parseFloat(p.price) || 0, regularPrice: parseFloat(p.regular_price) || 0, salePrice: p.sale_price ? parseFloat(p.sale_price) : null, img: p.images[0]?.src ?? null, icon: null, stockStatus: p.stock_status }));
    }
    return SAMPLE_PRODUCTS.map((sp) => ({ id: sp.id, name: t(`product_${sp.id}` as Parameters<typeof t>[0]), desc: t(`product_${sp.id}_desc` as Parameters<typeof t>[0]), price: sp.price, img: null, icon: sp.icon, stockStatus: "instock" }));
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
        {wooData && <span className="rounded bg-[oklch(94%_0.04_155)] px-2 py-0.5 text-[0.65rem] font-semibold text-[oklch(35%_0.12_155)]">🔗 WooCommerce</span>}
      </div>
      <ContentToolbar filterValue={filter} onFilterChange={setFilter} sortValue={sort} onSortChange={setSort} sortOptions={SORT_OPTIONS} filterPlaceholderKey="store_filter_placeholder" />
      <ProductGrid products={filteredProducts} />
      {!usingSamples && wooData && <Pagination currentPage={page} totalPages={wooData.totalPages} onPageChange={setPage} />}
    </div>
  );
}
