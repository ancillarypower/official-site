import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchWithProxy,
  wooApiUrl,
  wooAuthHeaders,
} from "@/lib/api";
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
    queryFn: async () => {
      const pageParams: Record<string, string> = {
        per_page: String(wooPerPage),
        page: String(page),
      };

      const url = wooApiUrl(baseUrl, "products", pageParams);

      // Direct mode: credentials in Authorization header (never in URL).
      // Proxy mode: no credentials — public CORS proxies cannot securely
      // relay authentication (Issue #43). Unauthenticated requests may
      // still succeed if the WooCommerce store allows public product access.
      const response = useProxy
        ? await fetchWithProxy(url, true)
        : await fetchWithProxy(url, false, {
            headers: wooAuthHeaders(wooKey, wooSecret),
          });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const totalPages = parseInt(
        response.headers.get("X-WP-TotalPages") ??
          response.headers.get("x-wp-totalpages") ?? "1",
      );
      const totalProducts = parseInt(
        response.headers.get("X-WP-Total") ??
          response.headers.get("x-wp-total") ?? "0",
      );

      const raw = await response.json();
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
    enabled: !!baseUrl && !!wooKey && !!wooSecret,
  });
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
      // Guard: all three WooCommerce settings must be present (Issue #137).
      // useMutation does not support `enabled`, so validate at runtime.
      if (!baseUrl || !wooKey || !wooSecret) {
        throw new Error(
          "WooCommerce is not fully configured. " +
            "Please provide the store URL, Consumer Key, and Consumer Secret in Settings.",
        );
      }

      // Proxy mode cannot securely handle checkout:
      // 1. POST body is lost through CORS proxy (Issue #45/#166)
      // 2. Credentials must not be sent to third-party proxies (Issue #43)
      if (useProxy) {
        throw new Error(
          "Checkout is not available in proxy mode. " +
            "CORS proxies cannot forward POST body or authentication securely. " +
            "Please disable the proxy or use a self-hosted backend proxy.",
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

      // Direct mode: credentials in Authorization header, never in URL.
      const url = wooApiUrl(baseUrl, "orders");
      const response = await fetch(url, {
        method: "POST",
        headers: {
          ...wooAuthHeaders(wooKey, wooSecret),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error((err as { message?: string })?.message ?? `HTTP ${response.status}`);
      }

      const raw = await response.json();
      const parsed = wooOrderSchema.safeParse(raw);
      return parsed.success ? parsed.data : (raw as WooOrder);
    },
    onSuccess: () => {
      // Invalidate product cache so stock status refreshes immediately
      // after a successful checkout (Issue #124).
      queryClient.invalidateQueries({ queryKey: ["woo-products"] });
    },
  });
}
