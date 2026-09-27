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

/** Helper: build a successful price-check Response for the given items. */
function makePriceCheckResponse(items: Array<{ id: number; price: string; stock_status?: string }>) {
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
    const orderResponse = { id: 700, order_key: "wc_order_bacs", payment_url: "https://shop.example.com/checkout/order-pay/700" };
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
      payment_method: "bacs",
      payment_method_title: "Direct Bank Transfer",
    });

    expect(order.id).toBe(700);

    // Order call is the second fetch (after price validation)
    const callInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const sentBody = JSON.parse(callInit.body as string);
    expect(sentBody.payment_method).toBe("bacs");
    expect(sentBody.payment_method_title).toBe("Direct Bank Transfer");
  });

  it("defaults to COD when payment_method is omitted (regression #510)", async () => {
    const orderResponse = { id: 701, order_key: "wc_order_default" };
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
      // payment_method intentionally omitted — should default to COD
    });

    // Order call is the second fetch (after price validation)
    const callInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const sentBody = JSON.parse(callInit.body as string);
    expect(sentBody.payment_method).toBe("cod");
    expect(sentBody.payment_method_title).toBe("貨到付款");
  });
});
