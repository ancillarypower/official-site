import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCheckout, validateCartPrices } from "@/hooks/useWooCommerce";
import { AppError } from "@/lib/errors";
import { FETCH_TIMEOUT } from "@/lib/constants";
import { useSettingsStore } from "@/stores/settingsStore";
import type { CartItem } from "@/stores/cartStore";

const BASE_URL = "https://shop.example.com";
const WOO_KEY = "ck_test";
const WOO_SECRET = "cs_test";

function makeItems(start: number, count: number): CartItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: start + index,
    name: `Widget ${start + index}`,
    price: 10,
    icon: null,
    img: null,
    qty: 1,
  }));
}

function makeResponse(items: unknown, status = 200) {
  return new Response(JSON.stringify(items), { status });
}

function getRequest(fetchMock: ReturnType<typeof vi.fn>, index: number) {
  const [input, init] = fetchMock.mock.calls[index] as [string, RequestInit];
  return { url: new URL(input), init };
}

function responseForRequest(input: string): Response {
  const url = new URL(input);
  const ids = (url.searchParams.get("include") ?? "").split(",").filter(Boolean);
  return makeResponse(
    ids.map((id) => ({ id: Number(id), price: "10.00", stock_status: "instock" })),
  );
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const checkoutBilling = {
  first_name: "Test",
  last_name: "User",
  email: "test@example.com",
  phone: "0912345678",
  address_1: "100 Main St",
  city: "Taipei",
  postcode: "100",
  country: "TW",
};

async function runCheckout(items: CartItem[], fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal("fetch", fetchMock);
  const { result } = renderHook(() => useCheckout(), { wrapper: createWrapper() });
  return result.current.mutateAsync({ items, billing: checkoutBilling });
}

describe("validateCartPrices batching (regression #603)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useSettingsStore.setState({
      wpUrl: BASE_URL,
      wooKey: WOO_KEY,
      wooSecret: WOO_SECRET,
      wooUseSameUrl: true,
      useProxy: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns empty results without fetching for an empty cart", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(validateCartPrices([], BASE_URL, WOO_KEY, WOO_SECRET)).resolves.toEqual({
      mismatches: [],
      unavailable: [],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses one exact 100-item request with authentication and a timeout signal", async () => {
    const fetchMock = vi.fn((input: string) =>
      Promise.resolve(responseForRequest(input)),
    );
    vi.stubGlobal("fetch", fetchMock);
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");

    await validateCartPrices(makeItems(1, 100), BASE_URL, WOO_KEY, WOO_SECRET);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const { url, init } = getRequest(fetchMock, 0);
    expect(url.searchParams.get("include")).toBe(
      makeItems(1, 100)
        .map((item) => item.id)
        .join(","),
    );
    expect(url.searchParams.get("per_page")).toBe("100");
    expect(url.searchParams.get("_fields")).toBe("id,price,stock_status");
    expect(url.href).not.toContain(WOO_KEY);
    expect(url.href).not.toContain(WOO_SECRET);
    expect(init.headers).toEqual({
      Authorization: `Basic ${btoa(`${WOO_KEY}:${WOO_SECRET}`)}`,
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(timeoutSpy).toHaveBeenCalledTimes(1);
    expect(timeoutSpy).toHaveBeenCalledWith(FETCH_TIMEOUT);
  });

  it.each([101, 201])(
    "splits %i products into exact batches of at most 100",
    async (count) => {
      const fetchMock = vi.fn((input: string) =>
        Promise.resolve(responseForRequest(input)),
      );
      vi.stubGlobal("fetch", fetchMock);

      await validateCartPrices(makeItems(1, count), BASE_URL, WOO_KEY, WOO_SECRET);

      const expectedBatches = [100, ...(count === 201 ? [100] : []), count % 100];
      expect(fetchMock).toHaveBeenCalledTimes(expectedBatches.length);
      let nextId = 1;
      for (const [index, batchLength] of expectedBatches.entries()) {
        const { url } = getRequest(fetchMock, index);
        expect(url.searchParams.get("include")).toBe(
          makeItems(nextId, batchLength)
            .map((item) => item.id)
            .join(","),
        );
        expect(url.searchParams.get("per_page")).toBe(String(batchLength));
        expect(Number(url.searchParams.get("per_page"))).toBeLessThanOrEqual(100);
        expect(url.searchParams.get("_fields")).toBe("id,price,stock_status");
        nextId += batchLength;
      }
    },
  );

  it("does not start the next request until the previous batch has completed", async () => {
    let resolveFirst!: (response: Response) => void;
    const firstResponse = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });
    const fetchMock = vi.fn((input: string) =>
      fetchMock.mock.calls.length === 1
        ? firstResponse
        : Promise.resolve(responseForRequest(input)),
    );
    vi.stubGlobal("fetch", fetchMock);

    const validation = validateCartPrices(
      makeItems(1, 101),
      BASE_URL,
      WOO_KEY,
      WOO_SECRET,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getRequest(fetchMock, 0).url.searchParams.get("per_page")).toBe("100");

    resolveFirst(responseForRequest(getRequest(fetchMock, 0).url.href));
    await validation;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getRequest(fetchMock, 1).url.searchParams.get("include")).toBe("101");
    expect(getRequest(fetchMock, 1).url.searchParams.get("per_page")).toBe("1");
  });

  it("uses a fresh timeout signal for every batch", async () => {
    const fetchMock = vi.fn((input: string) =>
      Promise.resolve(responseForRequest(input)),
    );
    vi.stubGlobal("fetch", fetchMock);
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");

    await validateCartPrices(makeItems(1, 201), BASE_URL, WOO_KEY, WOO_SECRET);

    const signals = fetchMock.mock.calls.map(([, init]) => (init as RequestInit).signal);
    expect(timeoutSpy).toHaveBeenCalledTimes(3);
    expect(timeoutSpy).toHaveBeenNthCalledWith(1, FETCH_TIMEOUT);
    expect(timeoutSpy).toHaveBeenNthCalledWith(2, FETCH_TIMEOUT);
    expect(timeoutSpy).toHaveBeenNthCalledWith(3, FETCH_TIMEOUT);
    expect(signals[0]).toBeInstanceOf(AbortSignal);
    expect(signals[1]).toBeInstanceOf(AbortSignal);
    expect(signals[2]).toBeInstanceOf(AbortSignal);
    expect(signals[0]).not.toBe(signals[1]);
    expect(signals[1]).not.toBe(signals[2]);
  });

  it("collects later-batch price mismatches, out-of-stock items, and missing products", async () => {
    const fetchMock = vi.fn((input: string) => {
      const url = new URL(input);
      const ids = (url.searchParams.get("include") ?? "").split(",").filter(Boolean);
      return Promise.resolve(
        makeResponse(
          ids
            .filter((id) => id !== "201")
            .map((id) => ({
              id: Number(id),
              price: id === "101" ? "12.00" : "10.00",
              stock_status: id === "102" ? "outofstock" : "instock",
            })),
        ),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await validateCartPrices(
      makeItems(1, 201),
      BASE_URL,
      WOO_KEY,
      WOO_SECRET,
    );

    expect(result.mismatches).toEqual([
      { id: 101, name: "Widget 101", cartPrice: 10, serverPrice: 12 },
    ]);
    expect(result.unavailable).toEqual([
      { id: 102, name: "Widget 102" },
      { id: 201, name: "Widget 201" },
    ]);
  });

  it("classifies an HTTP error in a later batch as price validation failure", async () => {
    const fetchMock = vi.fn((input: string) =>
      Promise.resolve(
        fetchMock.mock.calls.length === 2
          ? new Response("bad request", { status: 400 })
          : responseForRequest(input),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      validateCartPrices(makeItems(1, 101), BASE_URL, WOO_KEY, WOO_SECRET),
    ).rejects.toMatchObject({ code: "error_price_validation_failed" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["non-array JSON", () => makeResponse({ id: 101 })],
    ["invalid schema data", () => makeResponse([{ id: "invalid", price: "10.00" }])],
    ["malformed JSON", () => new Response("{", { status: 200 })],
  ])(
    "preserves response handling for %s in a later batch",
    async (_label, secondResponse) => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const fetchMock = vi.fn((input: string) =>
        Promise.resolve(
          fetchMock.mock.calls.length === 2
            ? secondResponse()
            : responseForRequest(input),
        ),
      );
      vi.stubGlobal("fetch", fetchMock);

      const expectedCode =
        _label === "malformed JSON"
          ? "error_proxy_bad_response"
          : "error_price_validation_failed";
      await expect(
        validateCartPrices(makeItems(1, 101), BASE_URL, WOO_KEY, WOO_SECRET),
      ).rejects.toMatchObject({ code: expectedCode });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );

  it("propagates a network failure in a later batch", async () => {
    const fetchMock = vi.fn((input: string) =>
      fetchMock.mock.calls.length === 2
        ? Promise.reject(new TypeError("Failed to fetch"))
        : Promise.resolve(responseForRequest(input)),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      validateCartPrices(makeItems(1, 101), BASE_URL, WOO_KEY, WOO_SECRET),
    ).rejects.toThrow("Failed to fetch");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("useCheckout batch price validation (regression #603)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useSettingsStore.setState({
      wpUrl: BASE_URL,
      wooKey: WOO_KEY,
      wooSecret: WOO_SECRET,
      wooUseSameUrl: true,
      useProxy: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("posts the order only after every batch succeeds", async () => {
    let resolveSecond!: (response: Response) => void;
    const secondResponse = new Promise<Response>((resolve) => {
      resolveSecond = resolve;
    });
    const orderResponse = new Response(
      JSON.stringify({
        id: 603,
        order_key: "wc_order_603",
        payment_url: "https://shop.example.com/checkout/order-pay/603",
      }),
      { status: 201 },
    );
    const fetchMock = vi.fn((input: string, init?: RequestInit) => {
      if (init?.method === "POST") return Promise.resolve(orderResponse);
      return fetchMock.mock.calls.length === 1
        ? Promise.resolve(responseForRequest(input))
        : secondResponse;
    });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useCheckout(), { wrapper: createWrapper() });

    let outcome: { value?: unknown; error?: unknown } | undefined;
    await act(async () => {
      const checkout = result.current
        .mutateAsync({ items: makeItems(1, 101), billing: checkoutBilling })
        .then(
          (value) => ({ value }),
          (error: unknown) => ({ error }),
        );
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
      expect((fetchMock.mock.calls[1]?.[1] as RequestInit)?.method).toBeUndefined();
      resolveSecond(responseForRequest(getRequest(fetchMock, 1).url.href));
      outcome = await checkout;
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({ method: "POST" });
    expect(outcome).toHaveProperty("value");
  });

  it.each([
    ["HTTP failure", "http"],
    ["price mismatch", "mismatch"],
    ["out-of-stock item", "stock"],
    ["missing item", "missing"],
  ] as const)("never posts after a later-batch %s", async (_label, failure) => {
    const fetchMock = vi.fn((input: string) => {
      if (fetchMock.mock.calls.length === 2) {
        if (failure === "http")
          return Promise.resolve(new Response("bad request", { status: 400 }));
        if (failure === "mismatch") {
          return Promise.resolve(
            makeResponse([{ id: 101, price: "12.00", stock_status: "instock" }]),
          );
        }
        if (failure === "stock") {
          return Promise.resolve(
            makeResponse([{ id: 101, price: "10.00", stock_status: "outofstock" }]),
          );
        }
        return Promise.resolve(makeResponse([]));
      }
      return Promise.resolve(responseForRequest(input));
    });

    await expect(runCheckout(makeItems(1, 101), fetchMock)).rejects.toBeInstanceOf(
      AppError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      fetchMock.mock.calls.some(([, init]) => (init as RequestInit)?.method === "POST"),
    ).toBe(false);
  });
});
