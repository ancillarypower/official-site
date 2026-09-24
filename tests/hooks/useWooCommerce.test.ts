import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSettingsStore } from "@/stores/settingsStore";
import { useWooProducts, useCheckout, normalizeRawProduct, validateCartPrices } from "@/hooks/useWooCommerce";
import { AppError } from "@/lib/errors";

function createWrapper(queryClient?: QueryClient) {
  const qc = queryClient ?? new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, children);
  };
}

/** Helper: build a successful price-check Response for the given items. */
function makePriceCheckResponse(items: Array<{ id: number; price: string; stock_status?: string }>) {
  return new Response(JSON.stringify(items), { status: 200 });
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

  it("is enabled in proxy mode without credentials (regression #219)", async () => {
    useSettingsStore.setState({ useProxy: true, wooKey: "", wooSecret: "" });
    const products = [
      { id: 1, name: "Public Widget", price: "10.00", regular_price: "10.00", sale_price: "", short_description: "", stock_status: "instock", images: [] },
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
    expect(result.current.data?.products).toHaveLength(1);
    expect(result.current.data?.products[0]?.name).toBe("Public Widget");
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

    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const calledUrl = callArgs?.[0] as string;
    const calledInit = callArgs?.[1] as RequestInit | undefined;
    expect(calledUrl).not.toContain("consumer_key");
    expect(calledUrl).not.toContain("consumer_secret");
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

    expect(warnSpy).toHaveBeenCalledWith(
      "[Woo] Zod parse warning:",
      expect.anything(),
    );

    const products = result.current.data?.products;
    expect(products).toHaveLength(2);
    expect(products?.[0]?.id).toBe(0);
    expect(products?.[0]?.name).toBe("");
    expect(products?.[0]?.price).toBe("0");
    expect(products?.[0]?.stock_status).toBe("instock");
    expect(products?.[0]?.images).toEqual([]);
    expect(products?.[1]?.id).toBe(0);
    expect(products?.[1]?.name).toBe("");
  });

  it("throws when API returns non-array and Zod parse fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
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

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);

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

    act(() => {
      useSettingsStore.setState({ wpUrl: "https://other.example.com" });
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const secondCallUrl = fetchMock.mock.calls[1]?.[0] as string;
    expect(secondCallUrl).toContain("other.example.com");
  });

  it("refetches when useProxy changes (Issue #93)", async () => {
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

    act(() => {
      useSettingsStore.setState({ useProxy: true });
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("infers totalPages from array length when headers are stripped (regression #178)", async () => {
    const products = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      name: `Product ${i + 1}`,
      price: "10.00",
      regular_price: "10.00",
      sale_price: "",
      short_description: "",
      stock_status: "instock",
      images: [],
    }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify(products), { status: 200 }),
    ));

    const { result } = renderHook(() => useWooProducts(2), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalPages).toBe(3);
    expect(result.current.data?.totalProducts).toBe(10);
  });

  it("infers last page when fewer items than wooPerPage and headers are stripped (regression #178)", async () => {
    const products = Array.from({ length: 3 }, (_, i) => ({
      id: i + 1,
      name: `Product ${i + 1}`,
      price: "5.00",
      regular_price: "5.00",
      sale_price: "",
      short_description: "",
      stock_status: "instock",
      images: [],
    }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify(products), { status: 200 }),
    ));

    const { result } = renderHook(() => useWooProducts(2), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalPages).toBe(2);
    expect(result.current.data?.totalProducts).toBe(3);
  });

  it("forwards TanStack Query signal to fetchWithProxy in direct mode (regression #205)", async () => {
    const products = [
      { id: 1, name: "Widget", price: "10.00", regular_price: "10.00", sale_price: "", short_description: "", stock_status: "instock", images: [] },
    ];
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(products), {
        status: 200,
        headers: { "X-WP-TotalPages": "1", "X-WP-Total": "1" },
      }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useWooProducts(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1]).toHaveProperty("signal");
    expect(callArgs[1].signal).toBeInstanceOf(AbortSignal);
  });

  /* -- Issue #275 Regression Tests -- */

  it("passes search parameter to WooCommerce API URL (regression #275)", async () => {
    const products = [
      { id: 1, name: "Widget", price: "10.00", regular_price: "10.00", sale_price: "", short_description: "", stock_status: "instock", images: [] },
    ];
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(products), {
        status: 200,
        headers: { "X-WP-TotalPages": "1", "X-WP-Total": "1" },
      }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useWooProducts(1, "Widget"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("search=Widget");
  });

  it("omits search parameter when empty (regression #275)", async () => {
    const products = [
      { id: 1, name: "Widget", price: "10.00", regular_price: "10.00", sale_price: "", short_description: "", stock_status: "instock", images: [] },
    ];
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(products), {
        status: 200,
        headers: { "X-WP-TotalPages": "1", "X-WP-Total": "1" },
      }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useWooProducts(1, ""), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).not.toContain("search=");
  });

  /* -- Issue #483 Regression Test -- */

  it("queryKey does not contain plaintext WooCommerce credentials (regression #483)", async () => {
    const products = [
      { id: 1, name: "Widget", price: "10.00", regular_price: "10.00", sale_price: "", short_description: "", stock_status: "instock", images: [] },
    ];
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(products), {
        status: 200,
        headers: { "X-WP-TotalPages": "1", "X-WP-Total": "1" },
      }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const { result } = renderHook(() => useWooProducts(1), {
      wrapper: createWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Inspect the active query's key — it must not contain plaintext credentials
    const activeQueries = qc.getQueryCache().getAll();
    const wooQuery = activeQueries.find((q) =>
      Array.isArray(q.queryKey) && q.queryKey[0] === "woo-products",
    );
    expect(wooQuery).toBeDefined();
    const key = wooQuery!.queryKey as unknown[];
    // "ck_test" and "cs_test" are the credentials set in beforeEach
    expect(key).not.toContain("ck_test");
    expect(key).not.toContain("cs_test");
  });

  /* -- Issue #485 Regression Tests -- */

  it("passes orderby and order to WooCommerce API URL (regression #485)", async () => {
    const products = [
      { id: 1, name: "Widget", price: "10.00", regular_price: "10.00", sale_price: "", short_description: "", stock_status: "instock", images: [] },
    ];
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(products), {
        status: 200,
        headers: { "X-WP-TotalPages": "1", "X-WP-Total": "1" },
      }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useWooProducts(1, "", "price", "asc"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("orderby=price");
    expect(calledUrl).toContain("order=asc");
  });

  it("uses default orderby=date and order=desc when not specified (regression #485)", async () => {
    const products = [
      { id: 1, name: "Widget", price: "10.00", regular_price: "10.00", sale_price: "", short_description: "", stock_status: "instock", images: [] },
    ];
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(products), {
        status: 200,
        headers: { "X-WP-TotalPages": "1", "X-WP-Total": "1" },
      }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useWooProducts(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("orderby=date");
    expect(calledUrl).toContain("order=desc");
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

describe("validateCartPrices", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty mismatches when prices match", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      makePriceCheckResponse([{ id: 1, price: "10.00" }]),
    ));

    const result = await validateCartPrices(
      [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 1 }],
      "https://shop.example.com",
      "ck_test",
      "cs_test",
    );

    expect(result.mismatches).toHaveLength(0);
  });

  it("detects price mismatches", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      makePriceCheckResponse([{ id: 1, price: "15.00" }]),
    ));

    const result = await validateCartPrices(
      [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 1 }],
      "https://shop.example.com",
      "ck_test",
      "cs_test",
    );

    expect(result.mismatches).toHaveLength(1);
    expect(result.mismatches[0]).toEqual({
      id: 1,
      name: "Widget",
      cartPrice: 10,
      serverPrice: 15,
    });
  });

  it("throws on HTTP error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("Server Error", { status: 500 }),
    ));

    await expect(
      validateCartPrices(
        [{ id: 1, name: "A", price: 5, icon: null, img: null, qty: 1 }],
        "https://shop.example.com",
        "ck_test",
        "cs_test",
      ),
    ).rejects.toThrow("Price validation failed: HTTP 500");
  });

  it("throws on non-array response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "not found" }), { status: 200 }),
    ));

    await expect(
      validateCartPrices(
        [{ id: 1, name: "A", price: 5, icon: null, img: null, qty: 1 }],
        "https://shop.example.com",
        "ck_test",
        "cs_test",
      ),
    ).rejects.toThrow("Price validation failed: unexpected response format");
  });

  /* -- Issue #243 Regression Tests -- */

  it("detects out-of-stock items (regression #243)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      makePriceCheckResponse([
        { id: 1, price: "10.00", stock_status: "outofstock" },
        { id: 2, price: "20.00", stock_status: "instock" },
      ]),
    ));

    const result = await validateCartPrices(
      [
        { id: 1, name: "Sold Out Widget", price: 10, icon: null, img: null, qty: 1 },
        { id: 2, name: "Available Widget", price: 20, icon: null, img: null, qty: 1 },
      ],
      "https://shop.example.com",
      "ck_test",
      "cs_test",
    );

    expect(result.mismatches).toHaveLength(0);
    expect(result.unavailable).toHaveLength(1);
    expect(result.unavailable[0]).toEqual({ id: 1, name: "Sold Out Widget" });
  });

  it("returns empty unavailable when all items are in stock (regression #243)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      makePriceCheckResponse([
        { id: 1, price: "10.00", stock_status: "instock" },
      ]),
    ));

    const result = await validateCartPrices(
      [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 1 }],
      "https://shop.example.com",
      "ck_test",
      "cs_test",
    );

    expect(result.unavailable).toHaveLength(0);
  });

  /* -- Issue #446 Regression Tests -- */

  it("treats products missing from server response as unavailable (regression #446)", async () => {
    // Server only returns product 1; product 2 is missing (deleted/private/filtered)
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      makePriceCheckResponse([{ id: 1, price: "10.00", stock_status: "instock" }]),
    ));

    const result = await validateCartPrices(
      [
        { id: 1, name: "Widget A", price: 10, icon: null, img: null, qty: 1 },
        { id: 2, name: "Widget B", price: 20, icon: null, img: null, qty: 1 },
      ],
      "https://shop.example.com",
      "ck_test",
      "cs_test",
    );

    expect(result.mismatches).toHaveLength(0);
    expect(result.unavailable).toHaveLength(1);
    expect(result.unavailable[0]).toEqual({ id: 2, name: "Widget B" });
  });

  it("returns empty unavailable when all cart products are present in server response (regression #446)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      makePriceCheckResponse([
        { id: 1, price: "10.00", stock_status: "instock" },
        { id: 2, price: "20.00", stock_status: "instock" },
      ]),
    ));

    const result = await validateCartPrices(
      [
        { id: 1, name: "Widget A", price: 10, icon: null, img: null, qty: 1 },
        { id: 2, name: "Widget B", price: 20, icon: null, img: null, qty: 1 },
      ],
      "https://shop.example.com",
      "ck_test",
      "cs_test",
    );

    expect(result.mismatches).toHaveLength(0);
    expect(result.unavailable).toHaveLength(0);
  });

  /* -- Issue #462 Regression Test -- */

  it("throws AppError instead of SyntaxError when server returns HTML (regression #462)", async () => {
    // Server returns HTML error page (e.g. 502 proxy page) with HTTP 200
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("<html>502 Bad Gateway</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    ));

    await expect(
      validateCartPrices(
        [{ id: 1, name: "A", price: 5, icon: null, img: null, qty: 1 }],
        "https://shop.example.com",
        "ck_test",
        "cs_test",
      ),
    ).rejects.toThrow(/Expected JSON response but received text\/html/);
  });

  /* -- Issue #486 Regression Tests -- */

  it("rejects items with non-numeric id via Zod validation (regression #486)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    // API returns id as string instead of number — Zod z.number() rejects
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ id: "not-a-number", price: "10.00" }]), { status: 200 }),
    ));

    await expect(
      validateCartPrices(
        [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 1 }],
        "https://shop.example.com",
        "ck_test",
        "cs_test",
      ),
    ).rejects.toThrow("Price validation failed: unexpected response format");

    expect(warnSpy).toHaveBeenCalledWith(
      "[Woo] Price validation Zod parse warning:",
      expect.anything(),
    );
  });

  it("handles null price gracefully with Zod catch fallback (regression #486)", async () => {
    // API returns price: null — Zod .catch("0") falls back to "0",
    // parseFloat("0") = 0, which differs from cart price 10 → mismatch
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ id: 1, price: null, stock_status: "instock" }]), { status: 200 }),
    ));

    const result = await validateCartPrices(
      [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 1 }],
      "https://shop.example.com",
      "ck_test",
      "cs_test",
    );

    // Should NOT throw — Zod .catch("0") handles null gracefully
    expect(result.mismatches).toHaveLength(1);
    expect(result.mismatches[0]).toEqual({
      id: 1,
      name: "Widget",
      cartPrice: 10,
      serverPrice: 0,
    });
    expect(result.unavailable).toHaveLength(0);
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
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makePriceCheckResponse([{ id: 1, price: "10.00" }]))
      .mockResolvedValueOnce(new Response(JSON.stringify(orderResponse), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

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

    // First call is price validation, second is order creation
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Verify order call (second) uses Basic Auth, not URL credentials
    const orderCallArgs = fetchMock.mock.calls[1];
    const calledUrl = orderCallArgs?.[0] as string;
    const calledInit = orderCallArgs?.[1] as RequestInit | undefined;
    expect(calledUrl).not.toContain("consumer_key");
    expect(calledUrl).not.toContain("consumer_secret");
    expect((calledInit?.headers as Record<string, string>)?.Authorization).toMatch(/^Basic /);
    expect(calledInit?.method).toBe("POST");
  });

  it("sends valid COD payment method in order body (regression #161)", async () => {
    const orderResponse = { id: 300, order_key: "wc_order_cod", payment_url: "https://shop.example.com/pay" };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makePriceCheckResponse([{ id: 1, price: "10.00" }]))
      .mockResolvedValueOnce(new Response(JSON.stringify(orderResponse), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCheckout(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      items: [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 1 }],
      billing: {
        first_name: "Test", last_name: "User", email: "test@example.com",
        phone: "0912345678", address_1: "100 Main St", city: "Taipei", postcode: "100", country: "TW",
      },
    });

    // Order call is the second fetch (after price validation)
    const callInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const sentBody = JSON.parse(callInit.body as string);
    expect(sentBody.payment_method).toBe("cod");
    expect(sentBody.payment_method_title).toBe("\u8CA8\u5230\u4ED8\u6B3E");
    expect(sentBody.payment_method).not.toBe("");
    expect(sentBody.payment_method_title).not.toBe("");
  });

  it("throws on HTTP error from order creation", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makePriceCheckResponse([{ id: 1, price: "5.00" }]))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "Bad request" }), { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

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
    expect(fetch).not.toHaveBeenCalled();
  });

  it("invalidates woo-products query cache on successful checkout (regression #124)", async () => {
    const orderResponse = { id: 200, order_key: "wc_order_xyz", payment_url: "https://shop.example.com/pay" };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makePriceCheckResponse([{ id: 1, price: "10.00" }]))
      .mockResolvedValueOnce(new Response(JSON.stringify(orderResponse), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useCheckout(), {
      wrapper: createWrapper(qc),
    });

    await result.current.mutateAsync({
      items: [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 1 }],
      billing: {
        first_name: "Jane", last_name: "Doe", email: "jane@example.com",
        phone: "5678", address_1: "456 Ave", city: "Taipei", postcode: "100", country: "TW",
      },
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["woo-products"] }),
    );
  });

  /* -- Issue #137 Regression Tests -- */

  it("throws when baseUrl is empty (regression #137)", async () => {
    useSettingsStore.setState({ wpUrl: "", wooUseSameUrl: true });
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
    ).rejects.toThrow("WooCommerce is not fully configured");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("throws when wooKey is empty (regression #137)", async () => {
    useSettingsStore.setState({ wooKey: "" });
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
    ).rejects.toThrow("WooCommerce is not fully configured");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("throws when wooSecret is empty (regression #137)", async () => {
    useSettingsStore.setState({ wooSecret: "" });
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
    ).rejects.toThrow("WooCommerce is not fully configured");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("throws when order response fails Zod validation (regression #192)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const invalidOrder = { unexpected: true, status: "completed" };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makePriceCheckResponse([{ id: 1, price: "5.00" }]))
      .mockResolvedValueOnce(new Response(JSON.stringify(invalidOrder), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCheckout(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({
        items: [{ id: 1, name: "A", price: 5, icon: null, img: null, qty: 1 }],
        billing: {
          first_name: "A", last_name: "B", email: "a@b.com",
          phone: "0900000000", address_1: "1 St", city: "Taipei", postcode: "100", country: "TW",
        },
      }),
    ).rejects.toThrow("Invalid order response from WooCommerce");

    expect(errorSpy).toHaveBeenCalledWith(
      "[Woo] Order response validation failed:",
      expect.anything(),
    );
  });

  /* -- Issue #222 Regression Tests -- */

  it("throws when server price differs from cart price (regression #222)", async () => {
    // Server returns price 15.00 but cart has price 10
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makePriceCheckResponse([{ id: 1, price: "15.00" }]));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCheckout(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({
        items: [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 2 }],
        billing: {
          first_name: "A", last_name: "B", email: "a@b.com",
          phone: "0900000000", address_1: "1 St", city: "Taipei", postcode: "100", country: "TW",
        },
      }),
    ).rejects.toThrow(/Price changed/);

    // Only the price validation fetch should have been called;
    // the order creation fetch must NOT be reached.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("proceeds to checkout when server prices match cart prices (regression #222)", async () => {
    const orderResponse = { id: 500, order_key: "wc_order_match", payment_url: "https://shop.example.com/pay" };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makePriceCheckResponse([{ id: 1, price: "10.00" }]))
      .mockResolvedValueOnce(new Response(JSON.stringify(orderResponse), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCheckout(), {
      wrapper: createWrapper(),
    });

    const order = await result.current.mutateAsync({
      items: [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 1 }],
      billing: {
        first_name: "A", last_name: "B", email: "a@b.com",
        phone: "0900000000", address_1: "1 St", city: "Taipei", postcode: "100", country: "TW",
      },
    });

    expect(order.id).toBe(500);
    // Both price validation and order creation fetches should be called
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  /* -- Issue #235 Regression Test -- */

  it("passes AbortSignal with timeout to checkout fetch (regression #235)", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    const orderResponse = { id: 600, order_key: "wc_order_timeout", payment_url: "https://shop.example.com/pay" };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makePriceCheckResponse([{ id: 1, price: "10.00" }]))
      .mockResolvedValueOnce(new Response(JSON.stringify(orderResponse), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCheckout(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      items: [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 1 }],
      billing: {
        first_name: "A", last_name: "B", email: "a@b.com",
        phone: "0900000000", address_1: "1 St", city: "Taipei", postcode: "100", country: "TW",
      },
    });

    // Order creation fetch (second call) must include a signal
    const orderCallInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(orderCallInit.signal).toBeInstanceOf(AbortSignal);

    // AbortSignal.timeout should have been called for the order fetch.
    // validateCartPrices also calls it, so at least 2 invocations total.
    expect(timeoutSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  /* -- Issue #243 Regression Test -- */

  it("throws when cart contains out-of-stock items (regression #243)", async () => {
    // Server returns stock_status: outofstock for item 1, price matches
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makePriceCheckResponse([
        { id: 1, price: "10.00", stock_status: "outofstock" },
        { id: 2, price: "20.00", stock_status: "instock" },
      ]));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCheckout(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({
        items: [
          { id: 1, name: "Sold Out Widget", price: 10, icon: null, img: null, qty: 1 },
          { id: 2, name: "Available Widget", price: 20, icon: null, img: null, qty: 1 },
        ],
        billing: {
          first_name: "A", last_name: "B", email: "a@b.com",
          phone: "0900000000", address_1: "1 St", city: "Taipei", postcode: "100", country: "TW",
        },
      }),
    ).rejects.toThrow(/out of stock/);

    // Only the price/stock validation fetch should have been called;
    // the order creation fetch must NOT be reached.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  /* -- Issue #484 Regression Tests -- */

  it("wraps HTTP error in AppError with i18n code (regression #484)", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makePriceCheckResponse([{ id: 1, price: "5.00" }]))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "Invalid email address" }), { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCheckout(), {
      wrapper: createWrapper(),
    });

    try {
      await result.current.mutateAsync({
        items: [{ id: 1, name: "A", price: 5, icon: null, img: null, qty: 1 }],
        billing: {
          first_name: "A", last_name: "B", email: "bad",
          phone: "0900000000", address_1: "1 St", city: "Taipei", postcode: "100", country: "TW",
        },
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).code).toBe("error_checkout_failed");
      expect((err as AppError).message).toContain("Invalid email address");
    }
  });

  it("handles non-JSON error response without SyntaxError (regression #484)", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makePriceCheckResponse([{ id: 1, price: "5.00" }]))
      .mockResolvedValueOnce(new Response("<html>503 Service Unavailable</html>", {
        status: 503,
        headers: { "content-type": "text/html" },
      }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCheckout(), {
      wrapper: createWrapper(),
    });

    try {
      await result.current.mutateAsync({
        items: [{ id: 1, name: "A", price: 5, icon: null, img: null, qty: 1 }],
        billing: {
          first_name: "A", last_name: "B", email: "a@b.com",
          phone: "0900000000", address_1: "1 St", city: "Taipei", postcode: "100", country: "TW",
        },
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      // Must be AppError, not SyntaxError
      expect(err).toBeInstanceOf(AppError);
      expect(err).not.toBeInstanceOf(SyntaxError);
      expect((err as AppError).code).toBe("error_checkout_failed");
      expect((err as AppError).message).toContain("Checkout failed");
    }
  });
});
