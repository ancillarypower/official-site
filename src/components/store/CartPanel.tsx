import { useState } from "react";
import { z } from "zod";
import { useI18n } from "@/context/I18nContext";
import { useCartStore } from "@/stores/cartStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useCheckout } from "@/hooks/useWooCommerce";
import { AppError } from "@/lib/errors";
import { formatPrice } from "@/lib/formatPrice";

const inputCls = "rounded-md border border-border-default bg-surface-base px-2.5 py-2 text-xs focus:border-accent focus:ring-2 focus:ring-accent-subtle focus:outline-none";
const inputErrCls = "rounded-md border border-danger bg-surface-base px-2.5 py-2 text-xs focus:border-danger focus:ring-2 focus:ring-danger/30 focus:outline-none";
const labelCls = "flex flex-col gap-1";
const labelTextCls = "text-xs font-medium text-secondary";

const billingSchema = z.object({
  first_name: z.string().trim().min(1, "checkout_field_required"),
  last_name: z.string().trim().min(1, "checkout_field_required"),
  email: z.string().trim().min(1, "checkout_field_required").email("checkout_invalid_email"),
  phone: z.string().trim().min(1, "checkout_field_required"),
  address_1: z.string().trim().min(1, "checkout_field_required"),
  city: z.string().trim().min(1, "checkout_field_required"),
  postcode: z.string().trim().min(1, "checkout_field_required"),
  country: z.string().trim().min(1, "checkout_field_required").length(2, "checkout_invalid_country"),
});

const shippingSchema = z.object({
  first_name: z.string().trim().min(1, "checkout_field_required"),
  last_name: z.string().trim().min(1, "checkout_field_required"),
  address_1: z.string().trim().min(1, "checkout_field_required"),
  city: z.string().trim().min(1, "checkout_field_required"),
  postcode: z.string().trim().min(1, "checkout_field_required"),
  country: z.string().trim().min(1, "checkout_field_required").length(2, "checkout_invalid_country"),
});

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
  const [shipToBilling, setShipToBilling] = useState(true);
  const [shipping, setShipping] = useState({ first_name: "", last_name: "", address_1: "", city: "", postcode: "", country: "TW" });
  const [orderStatus, setOrderStatus] = useState<"idle" | "success" | "error">("idle");
  const [orderError, setOrderError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const updateField = (field: string, value: string) => { setBilling((prev) => ({ ...prev, [field]: value })); if (orderError) setOrderError(""); setFieldErrors((prev) => { if (!prev[field]) return prev; const next = { ...prev }; delete next[field]; return next; }); };
  const updateShippingField = (field: string, value: string) => { setShipping((prev) => ({ ...prev, [field]: value })); if (orderError) setOrderError(""); setFieldErrors((prev) => { const key = `shipping_${field}`; if (!prev[key]) return prev; const next = { ...prev }; delete next[key]; return next; }); };
  const inputCn = (field: string) => fieldErrors[field] ? inputErrCls : inputCls;
  const shippingInputCn = (field: string) => fieldErrors[`shipping_${field}`] ? inputErrCls : inputCls;
  const fieldError = (field: string) => fieldErrors[field] ? <span className="text-[0.65rem] text-danger">{t(fieldErrors[field] as Parameters<typeof t>[0])}</span> : null;
  const shippingFieldError = (field: string) => fieldErrors[`shipping_${field}`] ? <span className="text-[0.65rem] text-danger">{t(fieldErrors[`shipping_${field}`] as Parameters<typeof t>[0])}</span> : null;
  function handleClearAll() { if (window.confirm(t("cart_clear_confirm"))) clearCart(); }
  async function handleCheckout() {
    setOrderError("");
    setFieldErrors({});
    const result = billingSchema.safeParse(billing);
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      setOrderError(t("checkout_required_fields"));
      return;
    }
    if (!shipToBilling) {
      const shipResult = shippingSchema.safeParse(shipping);
      if (!shipResult.success) {
        const errs: Record<string, string> = {};
        for (const issue of shipResult.error.issues) {
          const key = `shipping_${issue.path[0] as string}`;
          if (!errs[key]) errs[key] = issue.message;
        }
        setFieldErrors(errs);
        setOrderError(t("checkout_required_fields"));
        return;
      }
      try {
        const order = await checkout({ items, billing: result.data, shipping: shipResult.data });
        if (order.payment_url) { window.location.assign(order.payment_url); return; }
        setOrderStatus("success");
      } catch (err) {
        setOrderError(err instanceof AppError ? t("error_unhandled") : err instanceof Error ? err.message : t("error_unhandled"));
        setOrderStatus("error");
      }
    } else {
      try {
        const order = await checkout({ items, billing: result.data });
        if (order.payment_url) { window.location.assign(order.payment_url); return; }
        setOrderStatus("success");
      } catch (err) {
        setOrderError(err instanceof AppError ? t("error_unhandled") : err instanceof Error ? err.message : t("error_unhandled"));
        setOrderStatus("error");
      }
    }
  }
  return (
    <>
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-5"><h2 className="text-sm font-bold">{t("cart_title")}</h2><div className="flex items-center gap-2">{items.length > 0 && <button onClick={handleClearAll} className="rounded-md px-2 py-1 text-xs text-secondary transition-colors hover:bg-surface-sunken hover:text-danger" aria-label={t("cart_clear_all")}>🗑 {t("cart_clear_all")}</button>}<button onClick={closePanel} className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-sunken text-base text-secondary transition-colors hover:bg-border-default" aria-label={t("a11y_close")} title={t("a11y_close")}>✕</button></div></div>
      <div className="flex flex-1 flex-col gap-4 p-5">{items.length === 0 ? <div className="py-8 text-center text-sm text-tertiary">{t("cart_empty")}</div> : <>
        {items.map((item) => <div key={item.id} className="flex items-center gap-3 border-b border-border-subtle pb-3"><div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-surface-sunken text-lg">{item.img ? <img src={item.img} alt="" className="h-full w-full rounded-md object-cover" /> : item.icon ?? "📦"}</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{item.name}</div><div className="text-[0.725rem] text-tertiary">{formatPrice(item.price, lang)}</div></div><div className="flex items-center gap-1.5"><button onClick={() => updateQty(item.id, -1)} className="flex h-6 w-6 items-center justify-center rounded border border-border-default bg-surface-base text-sm font-semibold transition-colors hover:border-accent hover:text-accent" aria-label={t("a11y_decrease_qty")} title={t("a11y_decrease_qty")}>−</button><span className="min-w-5 text-center text-sm font-semibold tabular-nums">{item.qty}</span><button onClick={() => updateQty(item.id, 1)} className="flex h-6 w-6 items-center justify-center rounded border border-border-default bg-surface-base text-sm font-semibold transition-colors hover:border-accent hover:text-accent" aria-label={t("a11y_increase_qty")} title={t("a11y_increase_qty")}>+</button></div></div>)}
        <div className="mt-2 flex items-center justify-between border-t border-border-default pt-4 text-sm font-bold"><span>{t("cart_total")}</span><span>{formatPrice(totalPrice(), lang)}</span></div>
        <div className="flex flex-col gap-3 border-t border-border-subtle pt-4"><div className="text-[0.725rem] font-semibold tracking-wide text-tertiary uppercase">{t("checkout_billing")}</div><div className="grid grid-cols-2 gap-2"><label className={labelCls}><span className={labelTextCls}>{t("checkout_first_name")}</span><input name="given-name" autoComplete="given-name" value={billing.first_name} onChange={(e) => updateField("first_name", e.target.value)} placeholder={t("checkout_first_name")} className={inputCn("first_name")} />{fieldError("first_name")}</label><label className={labelCls}><span className={labelTextCls}>{t("checkout_last_name")}</span><input name="family-name" autoComplete="family-name" value={billing.last_name} onChange={(e) => updateField("last_name", e.target.value)} placeholder={t("checkout_last_name")} className={inputCn("last_name")} />{fieldError("last_name")}</label></div><label className={labelCls}><span className={labelTextCls}>{t("checkout_email")}</span><input name="email" autoComplete="email" type="email" value={billing.email} onChange={(e) => updateField("email", e.target.value)} placeholder={t("checkout_email")} className={inputCn("email")} />{fieldError("email")}</label><label className={labelCls}><span className={labelTextCls}>{t("checkout_phone")}</span><input name="tel" autoComplete="tel" type="tel" value={billing.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder={t("checkout_phone")} className={inputCn("phone")} />{fieldError("phone")}</label><label className={labelCls}><span className={labelTextCls}>{t("checkout_address")}</span><input name="street-address" autoComplete="street-address" value={billing.address_1} onChange={(e) => updateField("address_1", e.target.value)} placeholder={t("checkout_address")} className={inputCn("address_1")} />{fieldError("address_1")}</label><div className="grid grid-cols-2 gap-2"><label className={labelCls}><span className={labelTextCls}>{t("checkout_city")}</span><input name="address-level2" autoComplete="address-level2" value={billing.city} onChange={(e) => updateField("city", e.target.value)} placeholder={t("checkout_city")} className={inputCn("city")} />{fieldError("city")}</label><label className={labelCls}><span className={labelTextCls}>{t("checkout_postcode")}</span><input name="postal-code" autoComplete="postal-code" value={billing.postcode} onChange={(e) => updateField("postcode", e.target.value)} placeholder={t("checkout_postcode")} className={inputCn("postcode")} />{fieldError("postcode")}</label></div><label className={labelCls}><span className={labelTextCls}>{t("checkout_country")}</span><input name="country" autoComplete="country" value={billing.country} onChange={(e) => updateField("country", e.target.value)} placeholder={t("checkout_country")} className={inputCn("country")} />{fieldError("country")}</label></div>
        <label className="mt-2 flex items-center gap-2 text-xs text-secondary"><input type="checkbox" checked={shipToBilling} onChange={(e) => setShipToBilling(e.target.checked)} className="accent-accent" />{t("checkout_ship_to_billing")}</label>
        {!shipToBilling && <div className="flex flex-col gap-3 border-t border-border-subtle pt-4"><div className="text-[0.725rem] font-semibold tracking-wide text-tertiary uppercase">{t("checkout_shipping")}</div><div className="grid grid-cols-2 gap-2"><label className={labelCls}><span className={labelTextCls}>{t("checkout_first_name")}</span><input name="shipping-given-name" autoComplete="shipping given-name" value={shipping.first_name} onChange={(e) => updateShippingField("first_name", e.target.value)} placeholder={t("checkout_first_name")} className={shippingInputCn("first_name")} />{shippingFieldError("first_name")}</label><label className={labelCls}><span className={labelTextCls}>{t("checkout_last_name")}</span><input name="shipping-family-name" autoComplete="shipping family-name" value={shipping.last_name} onChange={(e) => updateShippingField("last_name", e.target.value)} placeholder={t("checkout_last_name")} className={shippingInputCn("last_name")} />{shippingFieldError("last_name")}</label></div><label className={labelCls}><span className={labelTextCls}>{t("checkout_address")}</span><input name="shipping-street-address" autoComplete="shipping street-address" value={shipping.address_1} onChange={(e) => updateShippingField("address_1", e.target.value)} placeholder={t("checkout_address")} className={shippingInputCn("address_1")} />{shippingFieldError("address_1")}</label><div className="grid grid-cols-2 gap-2"><label className={labelCls}><span className={labelTextCls}>{t("checkout_city")}</span><input name="shipping-address-level2" autoComplete="shipping address-level2" value={shipping.city} onChange={(e) => updateShippingField("city", e.target.value)} placeholder={t("checkout_city")} className={shippingInputCn("city")} />{shippingFieldError("city")}</label><label className={labelCls}><span className={labelTextCls}>{t("checkout_postcode")}</span><input name="shipping-postal-code" autoComplete="shipping postal-code" value={shipping.postcode} onChange={(e) => updateShippingField("postcode", e.target.value)} placeholder={t("checkout_postcode")} className={shippingInputCn("postcode")} />{shippingFieldError("postcode")}</label></div><label className={labelCls}><span className={labelTextCls}>{t("checkout_country")}</span><input name="shipping-country" autoComplete="shipping country" value={shipping.country} onChange={(e) => updateShippingField("country", e.target.value)} placeholder={t("checkout_country")} className={shippingInputCn("country")} />{shippingFieldError("country")}</label></div>}
        <p className="mt-1 text-[0.7rem] leading-relaxed text-tertiary">{t(wooConnected ? "checkout_note" : "checkout_no_woo")}</p>
        {orderError && <div className="rounded-md border border-danger/20 bg-danger/5 px-3 py-2.5 text-xs text-danger">{orderError}</div>}<button onClick={handleCheckout} disabled={!wooConnected || isPending || orderStatus === "success"} className="mt-3 w-full rounded-md bg-success py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">{isPending ? t("cart_checkout_processing") : t("cart_checkout")}</button>{orderStatus === "success" && <button onClick={() => { clearCart(); setOrderStatus("idle"); }} className="text-xs text-accent underline">{t("cart_clear_all")}</button>}
      </>}</div>
    </>
  );
}
