import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSettingsStore } from "@/stores/settingsStore";
import { useWooProducts } from "@/hooks/useWooCommerce";

/**
 * Regression tests for #599.
 *
 * WooCommerce REST API v3 requires authentication on every endpoint,
 * including GET /products. fetchWithProxy() cannot forward headers and
 * blocks credentials in the URL, so a proxy-mode request can only ever
 * return 401. Proxy mode must therefore not send the request at all, and
 * StorePage falls back to sample products with a notice.
 */

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, children);
  };
}

const product = {
  id: 1,
  name: "Widget",
  price: "10.00",
  regular_price: "10.00",
  sale_price: "",
  short_description: "",
  stock_status: "instock",
  images: [],
};

function makeResponse() {
  return new Response(JSON.stringify([product]), {
    status: 200,
    headers: { "X-WP-TotalPages": "1", "X-WP-Total": "1" },
  });
}

/** Give any would-be request a chance to fire before asserting it did not. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

describe("useWooProducts in proxy mode (regression #599)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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
    vi.unstubAllGlobals();
  });

  it("sends no request in proxy mode without credentials", async () => {
    useSettingsStore.setState({ useProxy: true, wooKey: "", wooSecret: "" });
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(makeResponse()));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useWooProducts(1), {
      wrapper: createWrapper(),
    });
    await settle();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.isError).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it("sends no request in proxy mode even when credentials are set", async () => {
    useSettingsStore.setState({ useProxy: true });
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(makeResponse()));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useWooProducts(1), {
      wrapper: createWrapper(),
    });
    await settle();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.isError).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it("drops real products and stops fetching when proxy mode is switched on", async () => {
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
    await settle();

    // No proxy request, and keepPreviousData must not keep showing the
    // direct-mode products as if they came from the proxy.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBeUndefined();
  });

  it("still fetches directly with a Basic Auth header in direct mode", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(makeResponse()));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useWooProducts(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const calledUrl = fetchMock.mock.calls[0]?.[0] as string;
    const calledInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(calledUrl.startsWith("https://shop.example.com/wp-json/wc/v3/products")).toBe(true);
    expect((calledInit?.headers as Record<string, string>)?.Authorization).toMatch(/^Basic /);
  });
});
