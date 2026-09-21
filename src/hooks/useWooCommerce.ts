import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchWithProxy,
  wooApiUrl,
  wooAuthHeaders,
  parseJsonResponse,
} from "@/lib/api";
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

export function useWooProducts(page: number = 1) {
  const wooKey = useSettingsStore((s) => s.wooKey);
  const wooSecret = useSettingsStore((s) => s.wooSecret);
  const wooPerPage = useSettingsStore((s) => s.wooPerPage);
  const useProxy = useSettingsStore((s) => s.useProxy);
  const baseUrl = useSettingsStore((s) => s.getWooBaseUrl());

  return useQuery<WooQueryResult>({
    queryKey: ["woo-products", baseUrl, wooKey, wooSecret, wooPerPage, page, useProxy],
    queryFn: async ({ signal }) => {
      const pageParams: Record<string, string> = {
        per_page: String(wooPerPage),
        page: String(page),
      };

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
          throw new Error("Unexpected API response: expected an array");
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
  });
}

/**
 * Validate that cart item prices still match WooCommerce server prices.
 *
 * Fetches the latest product prices in a single batch request and compares
 * them against the locally persisted cart prices. Returns any mismatches so
 * the caller can warn the user before submitting an order with a different
 * total than displayed (Issue #222).
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
}> {
  const ids = items.map((i) => i.id).join(",");
  const url = wooApiUrl(baseUrl, "products", {
    include: ids,
    per_page: String(items.length),
    _fields: "id,price",
  });

  const response = await fetch(url, {
    headers: wooAuthHeaders(wooKey, wooSecret),
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
  });

  if (!response.ok) {
    throw new Error(`Price validation failed: HTTP ${response.status}`);
  }

  const raw = await response.json();
  if (!Array.isArray(raw)) {
    throw new Error("Price validation failed: unexpected response format");
  }

  const serverPrices = new Map<number, number>();
  for (const p of raw as Array<{ id: number; price: string }>) {
    serverPrices.set(p.id, parseFloat(p.price));
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

  return { mismatches };
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
}

export function useCheckout() {
  const queryClient = useQueryClient();
  const wooKey = useSettingsStore((s) => s.wooKey);
  const wooSecret = useSettingsStore((s) => s.wooSecret);
  const useProxy = useSettingsStore((s) => s.useProxy);
  const baseUrl = useSettingsStore((s) => s.getWooBaseUrl());

  return useMutation<WooOrder, Error, CheckoutParams>({
    mutationFn: async ({ items, billing }) => {
      if (!baseUrl || !wooKey || !wooSecret) {
        throw new Error(
          "WooCommerce is not fully configured. " +
            "Please provide the store URL, Consumer Key, and Consumer Secret in Settings.",
        );
      }

      if (useProxy) {
        throw new Error(
          "Checkout is not available in proxy mode. " +
            "CORS proxies cannot forward POST body or authentication securely. " +
            "Please disable the proxy or use a self-hosted backend proxy.",
        );
      }

      // Validate cart prices against server before submitting order.
      // Cart items store a price snapshot from when they were added; if the
      // server price has changed since then, the displayed total differs
      // from the amount WooCommerce will actually charge (Issue #222).
      const { mismatches } = await validateCartPrices(
        items,
        baseUrl,
        wooKey,
        wooSecret,
      );
      if (mismatches.length > 0) {
        const details = mismatches
          .map((m) => `${m.name}: ${m.cartPrice} \u2192 ${m.serverPrice}`)
          .join(", ");
        throw new Error(
          `Price changed since items were added to cart. ` +
            `Please refresh and try again. Changed: ${details}`,
        );
      }

      const body = {
        payment_method: "cod",
        payment_method_title: "\u8CA8\u5230\u4ED8\u6B3E",
        set_paid: false,
        billing,
        shipping: billing,
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
        throw new Error("Invalid order response from WooCommerce");
      }
      return parsed.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["woo-products"] });
    },
  });
}
