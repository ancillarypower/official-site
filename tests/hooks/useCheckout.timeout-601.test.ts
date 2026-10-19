/**
 * Regression tests for Issue #601:
 * POST /orders is not idempotent. When it times out or the network drops,
 * WooCommerce may already have created the order, so the hook must report
 * an "outcome unknown" error (not a plain retryable error), send a client
 * order reference in meta_data, and use a dedicated timeout that is longer
 * than the default 15 s FETCH_TIMEOUT.
 *
 * The error type is asserted by `name` so the test-only commit fails on
 * assertions instead of on a missing export.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSettingsStore } from "@/stores/settingsStore";
import { useCheckout } from "@/hooks/useWooCommerce";
import { AppError, OrderCreatedError } from "@/lib/errors";
import { FETCH_TIMEOUT } from "@/lib/constants";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, children);
  };
}

function priceCheckResponse() {
  return new Response(JSON.stringify([{ id: 1, price: "10.00", stock_status: "instock" }]), { status: 200 });
}

const baseParams = {
  items: [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 1 }],
  billing: {
    first_name: "Test",
    last_name: "User",
    email: "test@example.com",
    phone: "0912345678",
    address_1: "100 Main St",
    city: "Taipei",
    postcode: "100",
    country: "TW",
  },
};

type MetaEntry = { key: string; value: unknown };

function sentOrderRef(fetchMock: ReturnType<typeof vi.fn>): unknown {
  // Order call is the second fetch (after price validation)
  const init = fetchMock.mock.calls[1]?.[1] as RequestInit;
  const body = JSON.parse(init.body as string) as { meta_data?: MetaEntry[] };
  return (body.meta_data ?? []).find((m) => m.key === "_client_order_ref")?.value;
}

async function runCheckout(extra: Record<string, unknown> = {}): Promise<unknown> {
  const { result } = renderHook(() => useCheckout(), { wrapper: createWrapper() });
  try {
    await result.current.mutateAsync({ ...baseParams, ...extra });
  } catch (err) {
    return err;
  }
  throw new Error("expected checkout to reject");
}

function expectOutcomeUnknown(err: unknown) {
  expect(err).toBeInstanceOf(AppError);
  expect(err).not.toBeInstanceOf(OrderCreatedError);
  expect((err as Error).name).toBe("OrderOutcomeUnknownError");
  expect((err as AppError).code).toBe("error_checkout_outcome_unknown");
}

describe("useCheckout unknown order outcome (regression #601)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
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
    vi.unstubAllGlobals();
  });

  it("reports an unknown outcome when POST /orders times out", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(priceCheckResponse())
      .mockRejectedValueOnce(new DOMException("The operation timed out.", "TimeoutError"));
    vi.stubGlobal("fetch", fetchMock);

    const err = await runCheckout();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expectOutcomeUnknown(err);
  });

  it("reports an unknown outcome when POST /orders fails with a network error", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(priceCheckResponse())
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);

    const err = await runCheckout();
    expectOutcomeUnknown(err);
  });

  it("sends a generated _client_order_ref and exposes it on the error", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(priceCheckResponse())
      .mockRejectedValueOnce(new DOMException("The operation timed out.", "TimeoutError"));
    vi.stubGlobal("fetch", fetchMock);

    const err = await runCheckout();
    const ref = sentOrderRef(fetchMock);
    expect(typeof ref).toBe("string");
    expect((ref as string).length).toBeGreaterThan(0);
    expect((err as AppError).params?.ref).toBe(ref);
  });

  it("forwards the caller's clientOrderRef so retries reuse the same reference", async () => {
    const orderResponse = {
      id: 601,
      order_key: "wc_order_601",
      payment_url: "https://shop.example.com/checkout/order-pay/601",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(priceCheckResponse())
      .mockResolvedValueOnce(new Response(JSON.stringify(orderResponse), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCheckout(), { wrapper: createWrapper() });
    await result.current.mutateAsync({ ...baseParams, clientOrderRef: "ref-601-retry" });

    expect(sentOrderRef(fetchMock)).toBe("ref-601-retry");
  });

  it("uses a longer dedicated timeout for POST /orders than the default fetch timeout", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(priceCheckResponse())
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "boom" }), { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    await runCheckout();
    // Call 0 is price validation (GET), call 1 is POST /orders.
    expect(timeoutSpy.mock.calls[0]?.[0]).toBe(FETCH_TIMEOUT);
    expect(timeoutSpy.mock.calls[1]?.[0]).toBeGreaterThan(FETCH_TIMEOUT);
  });

  it("still reports HTTP errors as a plain checkout failure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(priceCheckResponse())
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "boom" }), { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const err = await runCheckout();
    expect(err).toBeInstanceOf(AppError);
    expect((err as Error).name).not.toBe("OrderOutcomeUnknownError");
    expect((err as AppError).code).toBe("error_checkout_failed");
  });
});
