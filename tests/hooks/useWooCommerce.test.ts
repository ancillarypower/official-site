import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSettingsStore } from "@/stores/settingsStore";
import { useWooProducts, useCheckout } from "@/hooks/useWooCommerce";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe("useWooProducts", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useSettingsStore.setState({
      wpUrl: "https://shop.example.com",
      wooKey: "ck_test",
      wooSecret: "cs_test",
      wooPerPage: 10,
      wooUseSameUrl: true,
      useProxy: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exports useWooProducts function", () => {
    expect(typeof useWooProducts).toBe("function");
  });

  it("is disabled when wooKey is empty", () => {
    useSettingsStore.setState({ wooKey: "" });
    const { result } = renderHook(() => useWooProducts(1), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it("is disabled when wooSecret is empty", () => {
    useSettingsStore.setState({ wooSecret: "" });
    const { result } = renderHook(() => useWooProducts(1), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it("is disabled when base URL is empty", () => {
    useSettingsStore.setState({ wpUrl: "", wooUseSameUrl: true });
    const { result } = renderHook(() => useWooProducts(1), {
      wrapper: createWrapper(),
    });
    expect(result.current.data).toBeUndefined();
  });

  it("fetches products with Basic Auth header in direct mode", async () => {
    const products = [
      { id: 1, name: "Widget", price: "10.00", regular_price: "10.00", sale_price: "", short_description: "<p>desc</p>", stock_status: "instock", images: [] },
    ];
    const mockResponse = new Response(JSON.stringify(products), {
      status: 200,
      headers: { "X-WP-TotalPages": "3", "X-WP-Total": "25" },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const { result } = renderHook(() => useWooProducts(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.products).toHaveLength(1);
    expect(result.current.data?.products[0]?.name).toBe("Widget");
    expect(result.current.data?.totalPages).toBe(3);
    expect(result.current.data?.totalProducts).toBe(25);

    // Regression: credentials must NOT appear in the URL
    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const calledUrl = callArgs?.[0] as string;
    const calledInit = callArgs?.[1] as RequestInit | undefined;
    expect(calledUrl).not.toContain("consumer_key");
    expect(calledUrl).not.toContain("consumer_secret");
    // Credentials sent via Authorization header instead
    expect((calledInit?.headers as Record<string, string>)?.Authorization).toMatch(/^Basic /);
  });

  it("uses URL auth params in proxy mode", async () => {
    useSettingsStore.setState({ useProxy: true });
    const products = [
      { id: 1, name: "Widget", price: "10.00", regular_price: "10.00", sale_price: "", short_description: "", stock_status: "instock", images: [] },
    ];
    const mockResponse = new Response(JSON.stringify(products), {
      status: 200,
      headers: { "X-WP-TotalPages": "1", "X-WP-Total": "1" },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const { result } = renderHook(() => useWooProducts(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Proxy mode: URL should contain credentials (encoded inside proxy URL)
    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    const decodedUrl = decodeURIComponent(calledUrl);
    expect(decodedUrl).toContain("consumer_key=ck_test");
    expect(decodedUrl).toContain("consumer_secret=cs_test");
  });

  it("defaults totalPages to 1 when header is missing", async () => {
    const products = [{ id: 1, name: "A", price: "5", regular_price: "5", sale_price: "", short_description: "", stock_status: "instock", images: [] }];
    const mockResponse = new Response(JSON.stringify(products), { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const { result } = renderHook(() => useWooProducts(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalPages).toBe(1);
  });

  it("handles HTTP error", async () => {
    const mockResponse = new Response("Server Error", { status: 500 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const { result } = renderHook(() => useWooProducts(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("falls back to raw data when Zod parse fails", async () => {
    const products = [{ id: 1, name: "Raw", price: "5", unexpected: true }];
    const mockResponse = new Response(JSON.stringify(products), {
      status: 200,
      headers: { "X-WP-Total": "1" },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const { result } = renderHook(() => useWooProducts(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.products).toBeDefined();
  });
});

describe("useCheckout", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useSettingsStore.setState({
      wpUrl: "https://shop.example.com",
      wooKey: "ck_test",
      wooSecret: "cs_test",
      wooUseSameUrl: true,
      useProxy: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exports useCheckout function", () => {
    expect(typeof useCheckout).toBe("function");
  });

  it("can be called as a hook", () => {
    const { result } = renderHook(() => useCheckout(), {
      wrapper: createWrapper(),
    });
    expect(result.current.mutateAsync).toBeDefined();
    expect(result.current.isPending).toBe(false);
  });

  it("submits an order with Basic Auth header in direct mode", async () => {
    const orderResponse = { id: 100, order_key: "wc_order_abc", payment_url: "https://shop.example.com/pay" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify(orderResponse), { status: 200 }),
    ));

    const { result } = renderHook(() => useCheckout(), {
      wrapper: createWrapper(),
    });

    const order = await result.current.mutateAsync({
      items: [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 2 }],
      billing: {
        first_name: "John", last_name: "Doe", email: "john@example.com",
        phone: "1234", address_1: "123 St", city: "Taipei", postcode: "100", country: "TW",
      },
    });

    expect(order.id).toBe(100);

    // Regression: credentials must NOT appear in the URL
    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const calledUrl = callArgs?.[0] as string;
    const calledInit = callArgs?.[1] as RequestInit | undefined;
    expect(calledUrl).not.toContain("consumer_key");
    expect(calledUrl).not.toContain("consumer_secret");
    // Credentials sent via Authorization header instead
    expect((calledInit?.headers as Record<string, string>)?.Authorization).toMatch(/^Basic /);
    expect(calledInit?.method).toBe("POST");
  });

  it("throws on HTTP error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "Bad request" }), { status: 400 }),
    ));

    const { result } = renderHook(() => useCheckout(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({
        items: [{ id: 1, name: "A", price: 5, icon: null, img: null, qty: 1 }],
        billing: {
          first_name: "A", last_name: "B", email: "a@b.com",
          phone: "", address_1: "", city: "", postcode: "", country: "TW",
        },
      }),
    ).rejects.toThrow("Bad request");
  });

  it("uses URL auth params in proxy mode", async () => {
    useSettingsStore.setState({ useProxy: true });
    const orderResponse = { id: 200 };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify(orderResponse), { status: 200 }),
    ));

    const { result } = renderHook(() => useCheckout(), {
      wrapper: createWrapper(),
    });

    const order = await result.current.mutateAsync({
      items: [{ id: 1, name: "A", price: 5, icon: null, img: null, qty: 1 }],
      billing: {
        first_name: "A", last_name: "B", email: "a@b.com",
        phone: "", address_1: "", city: "", postcode: "", country: "TW",
      },
    });

    expect(order.id).toBe(200);
    // Proxy mode: credentials should be in URL
    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    const decodedUrl = decodeURIComponent(calledUrl);
    expect(decodedUrl).toContain("consumer_key=ck_test");
    expect(decodedUrl).toContain("consumer_secret=cs_test");
  });
});
