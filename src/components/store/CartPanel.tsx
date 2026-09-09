import { useState } from "react";
import { useI18n } from "@/context/I18nContext";
import { useCartStore } from "@/stores/cartStore";
import { useSettingsStore } from "@/stores/settingsStore";

export function CartPanel() {
  const { t } = useI18n();
  const { items, updateQty, totalPrice, clearCart } = useCartStore();
  const closePanel = useSettingsStore((s) => s.closePanel);
  const wooKey = useSettingsStore((s) => s.wooKey);
  const wooConnected = !!wooKey;

  const [billing, setBilling] = useState({ first_name: "", last_name: "", email: "", phone: "", address_1: "", city: "", postcode: "", country: "TW" });
  const [orderStatus, setOrderStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [orderError, setOrderError] = useState("");

  const updateField = (field: string, value: string) => setBilling((prev) => ({ ...prev, [field]: value }));

  async function handleCheckout() {
    if (!billing.first_name || !billing.last_name || !billing.email) { setOrderError(t("checkout_no_woo")); return; }
    setOrderStatus("processing");
    setOrderStatus("idle");
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-5">
        <h2 className="text-sm font-bold">{t("cart_title")}</h2>
        <button onClick={closePanel} className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-sunken text-base text-secondary transition-colors hover:bg-border-default" aria-label="Close">✕</button>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        {items.length === 0 ? <div className="py-8 text-center text-sm text-tertiary">{t("cart_empty")}</div> : (
          <>
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 border-b border-border-subtle pb-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-surface-sunken text-lg">
                  {item.img ? <img src={item.img} alt="" className="h-full w-full rounded-md object-cover" /> : item.icon ?? "📦"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{item.name}</div>
                  <div className="text-[0.725rem] text-tertiary">${item.price.toFixed(2)}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => updateQty(item.id, -1)} className="flex h-6 w-6 items-center justify-center rounded border border-border-default bg-surface-base text-sm font-semibold transition-colors hover:border-accent hover:text-accent" aria-label="Decrease">−</button>
                  <span className="min-w-5 text-center text-sm font-semibold tabular-nums">{item.qty}</span>
                  <button onClick={() => updateQty(item.id, 1)} className="flex h-6 w-6 items-center justify-center rounded border border-border-default bg-surface-base text-sm font-semibold transition-colors hover:border-accent hover:text-accent" aria-label="Increase">+</button>
                </div>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-border-default pt-4 text-sm font-bold">
              <span>{t("cart_total")}</span><span>${totalPrice().toFixed(2)}</span>
            </div>
            <div className="flex flex-col gap-3 border-t border-border-subtle pt-4">
              <div className="text-[0.725rem] font-semibold tracking-wide text-tertiary uppercase">{t("checkout_billing")}</div>
              <div className="grid grid-cols-2 gap-2">
                <input value={billing.first_name} onChange={(e) => updateField("first_name", e.target.value)} placeholder={t("checkout_first_name")} className="rounded-md border border-border-default bg-surface-base px-2.5 py-2 text-xs focus:border-accent focus:ring-2 focus:ring-accent-subtle focus:outline-none" />
                <input value={billing.last_name} onChange={(e) => updateField("last_name", e.target.value)} placeholder={t("checkout_last_name")} className="rounded-md border border-border-default bg-surface-base px-2.5 py-2 text-xs focus:border-accent focus:ring-2 focus:ring-accent-subtle focus:outline-none" />
              </div>
              <input type="email" value={billing.email} onChange={(e) => updateField("email", e.target.value)} placeholder={t("checkout_email")} className="rounded-md border border-border-default bg-surface-base px-2.5 py-2 text-xs focus:border-accent focus:ring-2 focus:ring-accent-subtle focus:outline-none" />
              <input value={billing.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder={t("checkout_phone")} className="rounded-md border border-border-default bg-surface-base px-2.5 py-2 text-xs focus:border-accent focus:ring-2 focus:ring-accent-subtle focus:outline-none" />
              <input value={billing.address_1} onChange={(e) => updateField("address_1", e.target.value)} placeholder={t("checkout_address")} className="rounded-md border border-border-default bg-surface-base px-2.5 py-2 text-xs focus:border-accent focus:ring-2 focus:ring-accent-subtle focus:outline-none" />
              <div className="grid grid-cols-2 gap-2">
                <input value={billing.city} onChange={(e) => updateField("city", e.target.value)} placeholder={t("checkout_city")} className="rounded-md border border-border-default bg-surface-base px-2.5 py-2 text-xs focus:border-accent focus:ring-2 focus:ring-accent-subtle focus:outline-none" />
                <input value={billing.postcode} onChange={(e) => updateField("postcode", e.target.value)} placeholder={t("checkout_postcode")} className="rounded-md border border-border-default bg-surface-base px-2.5 py-2 text-xs focus:border-accent focus:ring-2 focus:ring-accent-subtle focus:outline-none" />
              </div>
              <input value={billing.country} onChange={(e) => updateField("country", e.target.value)} placeholder={t("checkout_country")} className="rounded-md border border-border-default bg-surface-base px-2.5 py-2 text-xs focus:border-accent focus:ring-2 focus:ring-accent-subtle focus:outline-none" />
              <p className="mt-1 text-[0.7rem] leading-relaxed text-tertiary">{t(wooConnected ? "checkout_note" : "checkout_no_woo")}</p>
            </div>
            {orderError && <div className="rounded-md border border-[oklch(88%_0.06_25)] bg-[oklch(95%_0.04_25)] px-3 py-2.5 text-xs text-[oklch(40%_0.12_25)]">{orderError}</div>}
            <button onClick={handleCheckout} disabled={!wooConnected || orderStatus === "processing"} className="mt-3 w-full rounded-md bg-success py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">{orderStatus === "processing" ? t("cart_checkout_processing") : t("cart_checkout")}</button>
            {orderStatus === "success" && <button onClick={() => { clearCart(); setOrderStatus("idle"); }} className="text-xs text-accent underline">Clear cart</button>}
          </>
        )}
      </div>
    </>
  );
}
