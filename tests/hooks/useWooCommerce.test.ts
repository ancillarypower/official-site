import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSettingsStore } from "@/stores/settingsStore";
import { useWooProducts, useCheckout, normalizeRawProduct } from "@/hooks/useWooCommerce";

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

  it("does not include credentials in proxy mode URL", async () => {
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

    // Regression (Issue #43): credentials must NOT appear in proxy URL
    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    const decodedUrl = decodeURIComponent(calledUrl);
    expect(decodedUrl).not.toContain("consumer_key");
    expect(decodedUrl).not.toContain("consumer_secret");
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

  it("handles extra fields in valid product data", async () => {
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

  it("warns and normalizes products when Zod safeParse fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    // Data that triggers safeParse failure: id must be number, not string
    const invalidProducts = [
      { id: "bad", name: 123, extra: true },
      { id: "also-bad" },
    ];
    const mockResponse = new Response(JSON.stringify(invalidProducts), {
      status: 200,
      headers: { "X-WP-TotalPages": "1", "X-WP-Total": "2" },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const { result } = renderHook(() => useWooProducts(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Regression (Issue #48): console.warn must be called on parse failure
    expect(warnSpy).toHaveBeenCalledWith(
      "[Woo] Zod parse warning:",
      expect.anything(),
    );

    // Products should be normalized with safe defaults
    const products = result.current.data?.products;
    expect(products).toHaveLength(2);
    // First item: id was string "bad" → default 0, name was number → default ""
    expect(products?.[0]?.id).toBe(0);
    expect(products?.[0]?.name).toBe("");
    expect(products?.[0]?.price).toBe("0");
    expect(products?.[0]?.stock_status).toBe("instock");
    expect(products?.[0]?.images).toEqual([]);
    // Second item: all fields missing → all defaults
    expect(products?.[1]?.id).toBe(0);
    expect(products?.[1]?.name).toBe("");
  });

  it("throws when API returns non-array and Zod parse fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    // Non-array response that also fails Zod parse
    const mockResponse = new Response(JSON.stringify({ error: "not found" }), {
      status: 200,
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const { result } = renderHook(() => useWooProducts(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe(
      "Unexpected API response: expected an array",
    );
  });

  it("refetches when wooSecret changes (Issue #82)", async () => {
    const makeResponse = () =>
      new Response(
        JSON.stringify([
          { id: 1, name: "A", price: "5", regular_price: "5", sale_price: "", short_description: "", stock_status: "instock", images: [] },
        ]),
        { status: 200, headers: { "X-WP-TotalPages": "1", "X-WP-Total": "1" } },
      );
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(makeResponse()));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useWooProducts(1), {
      wrapper: createWrapper(),
    });

    // Wait for initial fetch
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Rotate secret — queryKey must include wooSecret so this triggers refetch
    act(() => {
      useSettingsStore.setState({ wooSecret: "cs_rotated" });
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("refetches when wpUrl changes via getWooBaseUrl selector (Issue #89)", async () => {
    const makeResponse = () =>
      new Response(
        JSON.stringify([
          { id: 1, name: "A", price: "5", regular_price: "5", sale_price: "", short_description: "", stock_status: "instock", images: [] },
        ]),
        { status: 200, headers: { "X-WP-TotalPages": "1", "X-WP-Total": "1" } },
      );
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(makeResponse()));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useWooProducts(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Change wpUrl — getWooBaseUrl() selector derives from wpUrl when
    // wooUseSameUrl is true, so baseUrl changes and queryKey triggers refetch
    act(() => {
      useSettingsStore.setState({ wpUrl: "https://other.example.com" });
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const secondCallUrl = fetchMock.mock.calls[1]?.[0] as string;
    expect(secondCallUrl).toContain("other.example.com");
  });
});

describe("normalizeRawProduct", () => {
  it("returns correct defaults for empty object", () => {
    const product = normalizeRawProduct({});
    expect(product.id).toBe(0);
    expect(product.name).toBe("");
    expect(product.price).toBe("0");
    expect(product.regular_price).toBe("0");
    expect(product.sale_price).toBe("");
    expect(product.short_description).toBe("");
    expect(product.stock_status).toBe("instock");
    expect(product.images).toEqual([]);
  });

  it("preserves valid field values", () => {
    const product = normalizeRawProduct({
      id: 42,
      name: "Test Product",
      price: "19.99",
      regular_price: "24.99",
      sale_price: "19.99",
      short_description: "<p>A test</p>",
      stock_status: "outofstock",
      images: [{ src: "https://example.com/img.jpg" }],
    });
    expect(product.id).toBe(42);
    expect(product.name).toBe("Test Product");
    expect(product.price).toBe("19.99");
    expect(product.regular_price).toBe("24.99");
    expect(product.sale_price).toBe("19.99");
    expect(product.short_description).toBe("<p>A test</p>");
    expect(product.stock_status).toBe("outofstock");
    expect(product.images).toEqual([{ src: "https://example.com/img.jpg" }]);
  });

  it("coerces wrong types to defaults", () => {
    const product = normalizeRawProduct({
      id: "not-a-number",
      name: 123,
      price: 9.99,
      images: "not-an-array",
    });
    expect(product.id).toBe(0);
    expect(product.name).toBe("");
    expect(product.price).toBe("0");
    expect(product.images).toEqual([]);
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

  it("throws immediately in proxy mode without calling fetch", async () => {
    useSettingsStore.setState({ useProxy: true });
    vi.stubGlobal("fetch", vi.fn());

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
    ).rejects.toThrow("Checkout is not available in proxy mode");
    // No network request should have been made
    expect(fetch).not.toHaveBeenCalled();
  });
});
