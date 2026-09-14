import { useQuery, useMutation } from "@tanstack/react-query";
import {
  fetchWithProxy,
  wooApiUrl,
  wooAuthHeaders,
  wooAuthParams,
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

      // Proxy mode: credentials in URL params (CORS proxies can't forward headers).
      // Direct mode: credentials in Authorization header (never in URL).
      const url = useProxy
        ? wooApiUrl(baseUrl, "products", {
            ...wooAuthParams(wooKey, wooSecret),
            ...pageParams,
          })
        : wooApiUrl(baseUrl, "products", pageParams);

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
      const body = {
        payment_method: "",
        payment_method_title: "",
        set_paid: false,
        billing,
        shipping: billing,
        line_items: items.map((item) => ({ product_id: item.id, quantity: item.qty })),
        status: "pending",
      };

      let response: Response;

      if (useProxy) {
        // Proxy mode: credentials in URL params (proxy can't forward headers).
        // NOTE: POST body is lost through CORS proxy (known issue #45/#166).
        const url = wooApiUrl(baseUrl, "orders", wooAuthParams(wooKey, wooSecret));
        response = await fetchWithProxy(url, true);
      } else {
        // Direct mode: credentials in Authorization header, never in URL.
        const url = wooApiUrl(baseUrl, "orders");
        response = await fetch(url, {
          method: "POST",
          headers: {
            ...wooAuthHeaders(wooKey, wooSecret),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
      }

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
