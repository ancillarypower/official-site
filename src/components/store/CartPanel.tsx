import { useState } from "react";
import { useI18n } from "@/context/I18nContext";
import { useCartStore } from "@/stores/cartStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useCheckout } from "@/hooks/useWooCommerce";
import { formatPrice } from "@/lib/formatPrice";

const inputCls = "rounded-md border border-border-default bg-surface-base px-2.5 py-2 text-xs focus:border-accent focus:ring-2 focus:ring-accent-subtle focus:outline-none";
const labelCls = "flex flex-col gap-1";
const labelTextCls = "text-xs font-medium text-secondary";

export function CartPanel() {
  const { t, lang } = useI18n();
  const { items, updateQty, totalPrice, clearCart } = useCartStore();
  const closePanel = useSettingsStore((s) => s.closePanel);
  const wooKey = useSettingsStore((s) => s.wooKey);
  const wooSecret = useSettingsStore((s) => s.wooSecret);
  const baseUrl = useSettingsStore((s) => s.getWooBaseUrl());
  const wooConnected = !!wooKey && !!wooSecret && !!baseUrl;

  const { mutateAsync: checkout, isPending } = useCheckout();

  const [billing, setBilling] = useState({ first_name: "", last_name: "", email: "", phone: "", address_1: "", city: "", postcode: "", country: "TW" });
  const [orderStatus, setOrderStatus] = useState<"idle" | "success" | "error">("idle");
  const [orderError, setOrderError] = useState("");

  const updateField = (field: string, value: string) => {
    setBilling((prev) => ({ ...prev, [field]: value }));
    if (orderError) setOrderError("");
  };

  function handleClearAll() {
    if (window.confirm(t("cart_clear_confirm"))) {
      clearCart();
    }
  }

  async function handleCheckout() {
    setOrderError("");
    if (!billing.first_name || !billing.last_name || !billing.email) {
      setOrderError(t("checkout_required_fields"));
      return;
    }
    try {
      await checkout({ items, billing });
      setOrderStatus("success");
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : "Checkout failed");
      setOrderStatus("error");
    }
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-5">
        <h2 className="text-sm font-bold">{t("cart_title")}</h2>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button onClick={handleClearAll} className="rounded-md px-2 py-1 text-xs text-secondary transition-colors hover:bg-surface-sunken hover:text-danger" aria-label={t("cart_clear_all")}>
              \uD83D\uDDD1 {t("cart_clear_all")}
            </button>
          )}
          <button onClick={closePanel} className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-sunken text-base text-secondary transition-colors hover:bg-border-default" aria-label={t("a11y_close")} title={t("a11y_close")}>\u2715</button>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        {items.length === 0 ? <div className="py-8 text-center text-sm text-tertiary">{t("cart_empty")}</div> : (
          <>
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 border-b border-border-subtle pb-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-surface-sunken text-lg">
                  {item.img ? <img src={item.img} alt="" className="h-full w-full rounded-md object-cover" /> : item.icon ?? "\uD83D\uDCE6"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{item.name}</div>
                  <div className="text-[0.725rem] text-tertiary">{formatPrice(item.price, lang)}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => updateQty(item.id, -1)} className="flex h-6 w-6 items-center justify-center rounded border border-border-default bg-surface-base text-sm font-semibold transition-colors hover:border-accent hover:text-accent" aria-label={t("a11y_decrease_qty")} title={t("a11y_decrease_qty")}>\u2212</button>
                  <span className="min-w-5 text-center text-sm font-semibold tabular-nums">{item.qty}</span>
                  <button onClick={() => updateQty(item.id, 1)} className="flex h-6 w-6 items-center justify-center rounded border border-border-default bg-surface-base text-sm font-semibold transition-colors hover:border-accent hover:text-accent" aria-label={t("a11y_increase_qty")} title={t("a11y_increase_qty")}>+</button>
                </div>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-border-default pt-4 text-sm font-bold">
              <span>{t("cart_total")}</span><span>{formatPrice(totalPrice(), lang)}</span>
            </div>
            <div className="flex flex-col gap-3 border-t border-border-subtle pt-4">
              <div className="text-[0.725rem] font-semibold tracking-wide text-tertiary uppercase">{t("checkout_billing")}</div>
              <div className="grid grid-cols-2 gap-2">
                <label className={labelCls}>
                  <span className={labelTextCls}>{t("checkout_first_name")}</span>
                  <input name="given-name" autoComplete="given-name" value={billing.first_name} onChange={(e) => updateField("first_name", e.target.value)} placeholder={t("checkout_first_name")} className={inputCls} />
                </label>
                <label className={labelCls}>
                  <span className={labelTextCls}>{t("checkout_last_name")}</span>
                  <input name="family-name" autoComplete="family-name" value={billing.last_name} onChange={(e) => updateField("last_name", e.target.value)} placeholder={t("checkout_last_name")} className={inputCls} />
                </label>
              </div>
              <label className={labelCls}>
                <span className={labelTextCls}>{t("checkout_email")}</span>
                <input name="email" autoComplete="email" type="email" value={billing.email} onChange={(e) => updateField("email", e.target.value)} placeholder={t("checkout_email")} className={inputCls} />
              </label>
              <label className={labelCls}>
                <span className={labelTextCls}>{t("checkout_phone")}</span>
                <input name="tel" autoComplete="tel" type="tel" value={billing.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder={t("checkout_phone")} className={inputCls} />
              </label>
              <label className={labelCls}>
                <span className={labelTextCls}>{t("checkout_address")}</span>
                <input name="street-address" autoComplete="street-address" value={billing.address_1} onChange={(e) => updateField("address_1", e.target.value)} placeholder={t("checkout_address")} className={inputCls} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className={labelCls}>
                  <span className={labelTextCls}>{t("checkout_city")}</span>
                  <input name="address-level2" autoComplete="address-level2" value={billing.city} onChange={(e) => updateField("city", e.target.value)} placeholder={t("checkout_city")} className={inputCls} />
                </label>
                <label className={labelCls}>
                  <span className={labelTextCls}>{t("checkout_postcode")}</span>
                  <input name="postal-code" autoComplete="postal-code" value={billing.postcode} onChange={(e) => updateField("postcode", e.target.value)} placeholder={t("checkout_postcode")} className={inputCls} />
                </label>
              </div>
              <label className={labelCls}>
                <span className={labelTextCls}>{t("checkout_country")}</span>
                <input name="country" autoComplete="country" value={billing.country} onChange={(e) => updateField("country", e.target.value)} placeholder={t("checkout_country")} className={inputCls} />
              </label>
              <p className="mt-1 text-[0.7rem] leading-relaxed text-tertiary">{t(wooConnected ? "checkout_note" : "checkout_no_woo")}</p>
            </div>
            {orderError && <div className="rounded-md border border-danger/20 bg-danger/5 px-3 py-2.5 text-xs text-danger">{orderError}</div>}
            <button onClick={handleCheckout} disabled={!wooConnected || isPending} className="mt-3 w-full rounded-md bg-success py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">{isPending ? t("cart_checkout_processing") : t("cart_checkout")}</button>
            {orderStatus === "success" && <button onClick={() => { clearCart(); setOrderStatus("idle"); }} className="text-xs text-accent underline">{t("cart_clear_all")}</button>}
          </>
        )}
      </div>
    </>
  );
}
