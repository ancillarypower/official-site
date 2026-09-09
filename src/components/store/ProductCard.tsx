import { useState } from "react";
import { useI18n } from "@/context/I18nContext";
import { useCartStore } from "@/stores/cartStore";
import type { DisplayProduct } from "@/lib/types";

interface ProductCardProps { product: DisplayProduct; }

export function ProductCard({ product }: ProductCardProps) {
  const { t } = useI18n();
  const { addItem, getQty } = useCartStore();
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const cartQty = getQty(product.id);
  const outOfStock = product.stockStatus === "outofstock";

  function handleAdd() {
    addItem({ id: product.id, name: product.name, price: product.price, icon: product.icon, img: product.img }, qty);
    setQty(1); setJustAdded(true); setTimeout(() => setJustAdded(false), 1000);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-raised transition-all hover:border-border-default hover:shadow-md">
      <div className="flex aspect-square items-center justify-center bg-surface-sunken text-4xl">
        {product.img ? <img src={product.img} alt={product.name} className="h-full w-full object-cover" loading="lazy" decoding="async" /> : product.icon ?? "📦"}
      </div>
      <div className="px-4 py-4">
        <h3 className="mb-1 text-sm font-semibold leading-snug">{product.name}</h3>
        <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-tertiary">{product.desc}</p>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold tabular-nums">
              {product.salePrice != null && <span className="mr-1.5 text-xs text-tertiary line-through">${product.regularPrice?.toFixed(2)}</span>}
              ${product.price.toFixed(2)}
            </span>
            {cartQty > 0 && <span className="rounded bg-accent-subtle px-2 py-0.5 text-[0.65rem] font-bold tabular-nums text-accent">{cartQty} {t("in_cart")}</span>}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center overflow-hidden rounded-md border border-border-default">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="flex h-[30px] w-7 items-center justify-center bg-surface-sunken text-sm font-semibold text-secondary transition-colors hover:bg-accent-subtle hover:text-accent" aria-label="Decrease quantity">−</button>
              <input type="number" value={qty} onChange={(e) => setQty(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))} className="h-[30px] w-9 border-x border-border-default bg-surface-raised text-center text-xs font-semibold tabular-nums outline-none" min={1} max={99} aria-label="Quantity" />
              <button onClick={() => setQty(Math.min(99, qty + 1))} className="flex h-[30px] w-7 items-center justify-center bg-surface-sunken text-sm font-semibold text-secondary transition-colors hover:bg-accent-subtle hover:text-accent" aria-label="Increase quantity">+</button>
            </div>
            <button onClick={handleAdd} disabled={outOfStock} className={`flex-1 rounded-md px-3.5 py-[7px] text-xs font-semibold text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${justAdded ? "bg-success" : "bg-accent hover:bg-accent-hover"}`}>{justAdded ? t("added") : t("add_to_cart")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
