import { useQuery, useMutation } from "@tanstack/react-query";
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

interface WooQueryResult {
  products: WooProduct[];
  totalPages: number;
  totalProducts: number;
}

export function useWooProducts(page: number = 1) {
  const { wooKey, wooSecret, wooPerPage, useProxy, getWooBaseUrl } =
    useSettingsStore();
  const baseUrl = getWooBaseUrl();

  return useQuery<WooQueryResult>({
    queryKey: ["woo-products", baseUrl, wooKey, wooPerPage, page],
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

      return {
        products: parsed.success ? parsed.data : (raw as WooProduct[]),
        totalPages,
        totalProducts: totalProducts || (parsed.success ? parsed.data.length : 0),
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
  const { wooKey, wooSecret, useProxy, getWooBaseUrl } = useSettingsStore();
  const baseUrl = getWooBaseUrl();

  return useMutation<WooOrder, Error, CheckoutParams>({
    mutationFn: async ({ items, billing }) => {
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
        payment_method: "",
        payment_method_title: "",
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
  });
}
