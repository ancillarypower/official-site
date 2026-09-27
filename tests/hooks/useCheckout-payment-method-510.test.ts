/**
 * Regression tests for Issue #510:
 * useCheckout hardcoded payment_method: "cod" — online payments unusable
 * and payment_url check is dead code.
 *
 * Verifies that CheckoutParams now accepts optional payment_method and
 * payment_method_title, forwarding them to the WooCommerce order body
 * while defaulting to COD for backward compatibility.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSettingsStore } from "@/stores/settingsStore";
import { useCheckout } from "@/hooks/useWooCommerce";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, children);
  };
}

function makePriceCheckResponse(
  items: Array<{ id: number; price: string; stock_status?: string }>,
) {
  return new Response(JSON.stringify(items), { status: 200 });
}

describe("useCheckout payment_method (Issue #510)", () => {
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

  it("custom payment_method is forwarded in order body (regression #510)", async () => {
    const orderResponse = {
      id: 700,
      order_key: "wc_order_bacs",
      payment_url: "https://shop.example.com/checkout/order-pay/700",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        makePriceCheckResponse([{ id: 1, price: "10.00" }]),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(orderResponse), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCheckout(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      items: [
        { id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 1 },
      ],
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
      payment_method: "bacs",
      payment_method_title: "Direct Bank Transfer",
    });

    // Order call is the second fetch (after price validation)
    const callInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const sentBody = JSON.parse(callInit.body as string);
    expect(sentBody.payment_method).toBe("bacs");
    expect(sentBody.payment_method_title).toBe("Direct Bank Transfer");
  });

  it("defaults to COD when payment_method is omitted (regression #510)", async () => {
    const orderResponse = {
      id: 800,
      order_key: "wc_order_default_cod",
      payment_url: "https://shop.example.com/pay",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        makePriceCheckResponse([{ id: 1, price: "10.00" }]),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(orderResponse), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCheckout(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      items: [
        { id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 1 },
      ],
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
      // No payment_method or payment_method_title — should default to COD
    });

    // Order call is the second fetch (after price validation)
    const callInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const sentBody = JSON.parse(callInit.body as string);
    expect(sentBody.payment_method).toBe("cod");
    expect(sentBody.payment_method_title).toBe("\u8CA8\u5230\u4ED8\u6B3E");
  });
});
