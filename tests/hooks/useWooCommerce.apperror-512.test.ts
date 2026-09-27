import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSettingsStore } from "@/stores/settingsStore";
import { useWooProducts } from "@/hooks/useWooCommerce";
import { AppError } from "@/lib/errors";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe("useWooProducts AppError regression (#512)", () => {
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

  it("HTTP error throws AppError with code error_api_http (regression #512)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("Server Error", { status: 500 }),
    ));

    const { result } = renderHook(() => useWooProducts(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(AppError);
    expect((result.current.error as AppError).code).toBe("error_api_http");
    expect((result.current.error as AppError).params?.status).toBe("500");
  });

  it("AppError.message preserves HTTP status for extractHttpStatus compatibility (regression #512)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("Not Found", { status: 404 }),
    ));

    const { result } = renderHook(() => useWooProducts(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    // FetchErrorState uses extractHttpStatus() regex on error.message
    // AppError fallback preserves "HTTP NNN" format in .message
    expect(result.current.error?.message).toMatch(/HTTP\s+404/);
  });
});
