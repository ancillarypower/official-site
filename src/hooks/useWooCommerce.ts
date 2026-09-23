import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  fetchWithProxy,
  wooApiUrl,
  wooAuthHeaders,
  parseJsonResponse,
} from "@/lib/api";
import { AppError } from "@/lib/errors";
import { FETCH_TIMEOUT } from "@/lib/constants";
import {
  wooProductArraySchema,
  wooOrderSchema,
  type WooProduct,
  type WooOrder,
} from "@/lib/types";
import { useSettingsStore } from "@/stores/settingsStore";
import type { CartItem } from "@/stores/cartStore";

/**
 * Normalize a raw API response item into a shape that matches WooProduct
 * when Zod safeParse fails and the schema defaults are skipped.
 * Mirrors the normalizeRawPost() pattern in useWordPress.ts.
 */
export function normalizeRawProduct(p: Record<string, unknown>): WooProduct {
  return {
    id: typeof p.id === "number" ? p.id : 0,
    name: typeof p.name === "string" ? p.name : "",
    price: typeof p.price === "string" ? p.price : "0",
    regular_price: typeof p.regular_price === "string" ? p.regular_price : "0",
    sale_price: typeof p.sale_price === "string" ? p.sale_price : "",
    short_description:
      typeof p.short_description === "string" ? p.short_description : "",
    stock_status:
      typeof p.stock_status === "string" ? p.stock_status : "instock",
    images: Array.isArray(p.images) ? p.images : [],
  };
}

interface WooQueryResult {
  products: WooProduct[];
  totalPages: number;
  totalProducts: number;
}

/**
 * Fetch WooCommerce products with pagination and optional server-side search.
 *
 * When a non-empty `search` string is provided, it is forwarded to the
 * WooCommerce REST API `?search=` parameter so the server filters across
 * all products, not just the current page. This mirrors the
 * useWordPress(page, search) pattern used by ContentPage (Issue #275).
 *
 * Uses `placeholderData: keepPreviousData` for smooth transitions while
 * the debounced search value settles.
 */
export function useWooProducts(page: number = 1, search: string = "") {
  const wooKey = useSettingsStore((s) => s.wooKey);
  const wooSecret = useSettingsStore((s) => s.wooSecret);
  const wooPerPage = useSettingsStore((s) => s.wooPerPage);
  const useProxy = useSettingsStore((s) => s.useProxy);
  const baseUrl = useSettingsStore((s) => s.getWooBaseUrl());

  return useQuery<WooQueryResult>({
    queryKey: ["woo-products", baseUrl, wooKey, wooSecret, wooPerPage, page, search, useProxy],
    queryFn: async ({ signal }) => {
      const pageParams: Record<string, string> = {
        per_page: String(wooPerPage),
        page: String(page),
      };

      if (search) {
        pageParams.search = search;
      }

      const url = wooApiUrl(baseUrl, "products", pageParams);

      const response = useProxy
        ? await fetchWithProxy(url, true, { signal })
        : await fetchWithProxy(url, false, {
            headers: wooAuthHeaders(wooKey, wooSecret),
            signal,
          });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const hasPageHeader =
        response.headers.has("X-WP-TotalPages") ||
        response.headers.has("x-wp-totalpages");

      let totalPages = parseInt(
        response.headers.get("X-WP-TotalPages") ??
          response.headers.get("x-wp-totalpages") ?? "1",
      );
      let totalProducts = parseInt(
        response.headers.get("X-WP-Total") ??
          response.headers.get("x-wp-total") ?? "0",
      );

      const raw = await parseJsonResponse(response);

      if (!hasPageHeader && Array.isArray(raw)) {
        totalPages = raw.length >= wooPerPage ? page + 1 : page;
        totalProducts = totalProducts || raw.length;
      }

      const parsed = wooProductArraySchema.safeParse(raw);

      if (!parsed.success) {
        console.warn("[Woo] Zod parse warning:", parsed.error);
        if (!Array.isArray(raw)) {
          throw new AppError(
            "error_api_unexpected_format",
            "Unexpected API response: expected an array",
          );
        }
        const products = (raw as Record<string, unknown>[]).map(
          normalizeRawProduct,
        );
        return { products, totalPages, totalProducts: totalProducts || products.length };
      }

      return {
        products: parsed.data,
        totalPages,
        totalProducts: totalProducts || parsed.data.length,
      };
    },
    enabled: useProxy
      ? !!baseUrl
      : !!baseUrl && !!wooKey && !!wooSecret,
    placeholderData: keepPreviousData,
  });
}

/**
 * Validate that cart item prices still match WooCommerce server prices
 * and that all items are still in stock.
 *
 * Fetches the latest product prices and stock status in a single batch
 * request and compares them against the locally persisted cart data.
 * Returns any price mismatches and out-of-stock items so the caller can
 * warn the user before submitting an order (Issue #222, Issue #243).
 *
 * Uses integer-cent comparison (Math.round(price * 100)) to avoid
 * floating-point precision issues (same strategy as cartStore.totalPrice).
 */
export async function validateCartPrices(
  items: CartItem[],
  baseUrl: string,
  wooKey: string,
  wooSecret: string,
): Promise<{
  mismatches: Array<{
    id: number;
    name: string;
    cartPrice: number;
    serverPrice: number;
  }>;
  unavailable: Array<{
    id: number;
    name: string;
  }>;
}> {
  const ids = items.map((i) => i.id).join(",");
  const url = wooApiUrl(baseUrl, "products", {
    include: ids,
    per_page: String(items.length),
    _fields: "id,price,stock_status",
  });

  const response = await fetch(url, {
    headers: wooAuthHeaders(wooKey, wooSecret),
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
  });

  if (!response.ok) {
    throw new AppError(
      "error_price_validation_failed",
      `Price validation failed: HTTP ${response.status}`,
      { detail: `HTTP ${response.status}` },
    );
  }

  const raw = await parseJsonResponse(response);
  if (!Array.isArray(raw)) {
    throw new AppError(
      "error_price_validation_failed",
      "Price validation failed: unexpected response format",
      { detail: "unexpected response format" },
    );
  }

  const serverPrices = new Map<number, number>();
  const serverStockStatus = new Map<number, string>();
  for (const p of raw as Array<{ id: number; price: string; stock_status?: string }>) {
    serverPrices.set(p.id, parseFloat(p.price));
    if (p.stock_status) {
      serverStockStatus.set(p.id, p.stock_status);
    }
  }

  const mismatches: Array<{
    id: number;
    name: string;
    cartPrice: number;
    serverPrice: number;
  }> = [];
  for (const item of items) {
    const serverPrice = serverPrices.get(item.id);
    if (serverPrice === undefined) continue;
    if (Math.round(item.price * 100) !== Math.round(serverPrice * 100)) {
      mismatches.push({
        id: item.id,
        name: item.name,
        cartPrice: item.price,
        serverPrice,
      });
    }
  }

  const unavailable: Array<{ id: number; name: string }> = [];
  for (const item of items) {
    const status = serverStockStatus.get(item.id);
    if (status === "outofstock") {
      unavailable.push({ id: item.id, name: item.name });
    }
  }

  // Detect products missing from server response (deleted, private, or
  // permission-filtered). Requested via `include` but not returned by
  // WooCommerce — treat as unavailable (Issue #446).
  for (const item of items) {
    if (!serverPrices.has(item.id)) {
      unavailable.push({ id: item.id, name: item.name });
    }
  }

  return { mismatches, unavailable };
}

/**
 * Shipping address fields accepted by WooCommerce.
 * Excludes email and phone which are billing-only (Issue #285).
 */
export interface ShippingAddress {
  first_name: string;
  last_name: string;
  address_1: string;
  city: string;
  postcode: string;
  country: string;
}

interface CheckoutParams {
  items: CartItem[];
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address_1: string;
    city: string;
    postcode: string;
    country: string;
  };
  /** Optional separate shipping address. When omitted, derived from billing (sans email/phone). */
  shipping?: ShippingAddress;
}

export function useCheckout() {
  const queryClient = useQueryClient();
  const wooKey = useSettingsStore((s) => s.wooKey);
  const wooSecret = useSettingsStore((s) => s.wooSecret);
  const useProxy = useSettingsStore((s) => s.useProxy);
  const baseUrl = useSettingsStore((s) => s.getWooBaseUrl());

  return useMutation<WooOrder, Error, CheckoutParams>({
    mutationFn: async ({ items, billing, shipping }) => {
      if (!baseUrl || !wooKey || !wooSecret) {
        throw new AppError(
          "error_woo_not_configured",
          "WooCommerce is not fully configured. " +
            "Please provide the store URL, Consumer Key, and Consumer Secret in Settings.",
        );
      }

      if (useProxy) {
        throw new AppError(
          "error_checkout_proxy_unavailable",
          "Checkout is not available in proxy mode. " +
            "CORS proxies cannot forward POST body or authentication securely. " +
            "Please disable the proxy or use a self-hosted backend proxy.",
        );
      }

      // Validate cart prices and stock status against server before
      // submitting order. Cart items store a price snapshot from when
      // they were added; if the server price has changed since then, the
      // displayed total differs from the amount WooCommerce will actually
      // charge (Issue #222). Items may also have gone out of stock since
      // being added to the cart (Issue #243).
      const { mismatches, unavailable } = await validateCartPrices(
        items,
        baseUrl,
        wooKey,
        wooSecret,
      );
      if (mismatches.length > 0) {
        const details = mismatches
          .map((m) => `${m.name}: ${m.cartPrice} \u2192 ${m.serverPrice}`)
          .join(", ");
        throw new AppError(
          "error_price_changed",
          `Price changed since items were added to cart. ` +
            `Please refresh and try again. Changed: ${details}`,
          { details },
        );
      }
      if (unavailable.length > 0) {
        const names = unavailable.map((u) => u.name).join(", ");
        throw new AppError(
          "error_items_out_of_stock",
          `The following items are out of stock: ${names}. ` +
            `Please remove them from your cart and try again.`,
          { names },
        );
      }

      // Derive shipping from billing when not explicitly provided,
      // excluding email and phone which are billing-only (Issue #285).
      const resolvedShipping: ShippingAddress = shipping ?? {
        first_name: billing.first_name,
        last_name: billing.last_name,
        address_1: billing.address_1,
        city: billing.city,
        postcode: billing.postcode,
        country: billing.country,
      };

      const body = {
        payment_method: "cod",
        payment_method_title: "\u8CA8\u5230\u4ED8\u6B3E",
        set_paid: false,
        billing,
        shipping: resolvedShipping,
        line_items: items.map((item) => ({ product_id: item.id, quantity: item.qty })),
        status: "pending",
      };

      const url = wooApiUrl(baseUrl, "orders");
      const response = await fetch(url, {
        method: "POST",
        headers: {
          ...wooAuthHeaders(wooKey, wooSecret),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error((err as { message?: string })?.message ?? `HTTP ${response.status}`);
      }

      const raw = await response.json();
      const parsed = wooOrderSchema.safeParse(raw);
      if (!parsed.success) {
        console.error("[Woo] Order response validation failed:", parsed.error);
        throw new AppError(
          "error_order_response_invalid",
          "Invalid order response from WooCommerce",
        );
      }
      return parsed.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["woo-products"] });
    },
  });
}
