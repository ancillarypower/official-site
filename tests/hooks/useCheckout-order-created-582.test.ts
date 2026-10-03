/**
 * Regression tests for Issue #582:
 * every failure that happens after POST /orders returned 2xx must be
 * reported as OrderCreatedError, and failures before the order exists
 * must not. CartPanel relies on this to decide whether to clear the
 * cart, instead of matching an error code string.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSettingsStore } from "@/stores/settingsStore";
import { useCheckout } from "@/hooks/useWooCommerce";
import { AppError, OrderCreatedError } from "@/lib/errors";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, children);
  };
}

function priceCheckResponse(price = "10.00") {
  return new Response(JSON.stringify([{ id: 1, price, stock_status: "instock" }]), { status: 200 });
}

const params = {
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

async function runCheckout(): Promise<unknown> {
  const { result } = renderHook(() => useCheckout(), { wrapper: createWrapper() });
  try {
    await result.current.mutateAsync(params);
  } catch (err) {
    return err;
  }
  throw new Error("expected checkout to reject");
}

describe("useCheckout order-created signal (regression #582)", () => {
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

  it("throws OrderCreatedError when the 2xx order response fails schema validation", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(priceCheckResponse())
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "not-a-number" }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const err = await runCheckout();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(err).toBeInstanceOf(OrderCreatedError);
    expect((err as AppError).code).toBe("error_order_response_invalid");
  });

  it("throws OrderCreatedError when the 2xx order response is not JSON", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(priceCheckResponse())
      .mockResolvedValueOnce(new Response("<html>ok</html>", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const err = await runCheckout();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(err).toBeInstanceOf(OrderCreatedError);
    expect((err as AppError).code).toBe("error_order_response_invalid");
  });

  it("does not throw OrderCreatedError when price validation fails before POST", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(priceCheckResponse("15.00"));
    vi.stubGlobal("fetch", fetchMock);

    const err = await runCheckout();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(err).toBeInstanceOf(AppError);
    expect(err).not.toBeInstanceOf(OrderCreatedError);
    expect((err as AppError).code).toBe("error_price_changed");
  });

  it("does not throw OrderCreatedError when POST /orders returns 5xx", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(priceCheckResponse())
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "boom" }), { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const err = await runCheckout();
    expect(err).toBeInstanceOf(AppError);
    expect(err).not.toBeInstanceOf(OrderCreatedError);
    expect((err as AppError).code).toBe("error_checkout_failed");
  });
});
