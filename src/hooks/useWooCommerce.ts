import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchWithProxy, wooApiUrl } from "@/lib/api";
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
      const url = wooApiUrl(baseUrl, "products", wooKey, wooSecret, {
        per_page: String(wooPerPage),
        page: String(page),
      });

      const response = await fetchWithProxy(url, useProxy);
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
      const url = wooApiUrl(baseUrl, "orders", wooKey, wooSecret);
      const body = {
        payment_method: "",
        payment_method_title: "",
        set_paid: false,
        billing,
        shipping: billing,
        line_items: items.map((item) => ({ product_id: item.id, quantity: item.qty })),
        status: "pending",
      };

      const response = useProxy
        ? await fetchWithProxy(url, true)
        : await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

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
