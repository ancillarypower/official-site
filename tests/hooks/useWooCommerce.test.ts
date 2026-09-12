import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useSettingsStore } from "@/stores/settingsStore";

const { mockFetchWithProxy, mockWooApiUrl } = vi.hoisted(() => ({
  mockFetchWithProxy: vi.fn(),
  mockWooApiUrl: vi.fn((base: string, endpoint: string, key: string, secret: string, params?: Record<string, string>) => {
    const b = base.trim().replace(/\/+$/, "");
    const url = new URL(`${b}/wp-json/wc/v3/${endpoint}`);
    url.searchParams.set("consumer_key", key);
    url.searchParams.set("consumer_secret", secret);
    if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    return url.toString();
  }),
}));

vi.mock("@/lib/api", () => ({
  fetchWithProxy: (...args: unknown[]) => mockFetchWithProxy(...args),
  wooApiUrl: (...args: unknown[]) => mockWooApiUrl(...args),
  wpApiUrl: vi.fn((s: string) => `${s.trim().replace(/\/+$/, "")}/wp-json/wp/v2`),
}));

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
    vi.clearAllMocks();
    useSettingsStore.setState({
      wooKey: "ck_test",
      wooSecret: "cs_test",
      wooPerPage: 10,
      useProxy: false,
      wpUrl: "https://shop.example.com",
      wooUseSameUrl: true,
      wooUrl: "",
    });
  });

  it("fetches products when credentials are present", async () => {
    const products = [
      { id: 1, name: "Widget", price: "10.00", regular_price: "10.00", sale_price: "", short_description: "", stock_status: "instock", images: [] },
    ];
    mockFetchWithProxy.mockResolvedValue({
      ok: true,
      headers: new Headers({ "X-WP-TotalPages": "2", "X-WP-Total": "15" }),
      json: () => Promise.resolve(products),
    });

    const { result } = renderHook(() => useWooProducts(1), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.products).toHaveLength(1);
    expect(result.current.data?.products[0]?.name).toBe("Widget");
    expect(result.current.data?.totalPages).toBe(2);
    expect(result.current.data?.totalProducts).toBe(15);
  });

  it("is disabled when wooKey is empty", () => {
    useSettingsStore.setState({ wooKey: "" });
    const { result } = renderHook(() => useWooProducts(1), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("is disabled when wooSecret is empty", () => {
    useSettingsStore.setState({ wooSecret: "" });
    const { result } = renderHook(() => useWooProducts(1), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("is disabled when base URL is empty", () => {
    useSettingsStore.setState({ wpUrl: "" });
    const { result } = renderHook(() => useWooProducts(1), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("handles HTTP error", async () => {
    mockFetchWithProxy.mockResolvedValue({ ok: false, status: 500 });
    const { result } = renderHook(() => useWooProducts(1), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("HTTP 500");
  });

  it("falls back to raw data when Zod parse fails", async () => {
    const raw = [{ id: 1, name: 12345 }];
    mockFetchWithProxy.mockResolvedValue({
      ok: true,
      headers: new Headers({ "X-WP-TotalPages": "1", "X-WP-Total": "1" }),
      json: () => Promise.resolve(raw),
    });

    const { result } = renderHook(() => useWooProducts(1), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.products).toBeTruthy();
  });

  it("defaults totalPages to 1 and totalProducts to array length when headers missing", async () => {
    mockFetchWithProxy.mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: () => Promise.resolve([{ id: 1, name: "A", price: "5" }, { id: 2, name: "B", price: "10" }]),
    });

    const { result } = renderHook(() => useWooProducts(1), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalPages).toBe(1);
    expect(result.current.data?.totalProducts).toBe(2);
  });

  it("passes page parameter to API URL", async () => {
    mockFetchWithProxy.mockResolvedValue({
      ok: true,
      headers: new Headers({ "X-WP-TotalPages": "1", "X-WP-Total": "1" }),
      json: () => Promise.resolve([{ id: 1, name: "A", price: "5" }]),
    });

    renderHook(() => useWooProducts(3), { wrapper: createWrapper() });
    await waitFor(() => expect(mockWooApiUrl).toHaveBeenCalled());
    const calledParams = mockWooApiUrl.mock.calls[0]?.[4] as Record<string, string> | undefined;
    expect(calledParams?.page).toBe("3");
  });
});

describe("useCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({
      wooKey: "ck_test",
      wooSecret: "cs_test",
      useProxy: false,
      wpUrl: "https://shop.example.com",
      wooUseSameUrl: true,
      wooUrl: "",
    });
  });

  it("returns a mutation function", () => {
    const { result } = renderHook(() => useCheckout(), { wrapper: createWrapper() });
    expect(result.current.mutateAsync).toBeTypeOf("function");
    expect(result.current.isIdle).toBe(true);
  });
});
