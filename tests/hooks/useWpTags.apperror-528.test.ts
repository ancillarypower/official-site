import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { AppError } from "@/lib/errors";

// Mock settingsStore to return valid settings
vi.mock("@/stores/settingsStore", () => ({
  useSettingsStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      wpUrl: "https://example.com",
      contentType: "posts",
      useProxy: false,
    }),
}));

// Mock api module
const mockFetchWithProxy = vi.fn();
vi.mock("@/lib/api", () => ({
  fetchWithProxy: (...args: unknown[]) => mockFetchWithProxy(...args),
  wpApiUrl: (url: string) => `${url}/wp-json/wp/v2`,
  parseJsonResponse: (r: Response) => r.json(),
}));

import { useWpTags } from "@/hooks/useWpTags";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe("useWpTags AppError regression (#528)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws AppError with code error_api_http on HTTP error", async () => {
    mockFetchWithProxy.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useWpTags(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const err = result.current.error;
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).code).toBe("error_api_http");
    expect((err as AppError).params?.status).toBe("500");
  });

  it("includes HTTP status in error message for backward compatibility", async () => {
    mockFetchWithProxy.mockResolvedValue({
      ok: false,
      status: 403,
    });

    const { result } = renderHook(() => useWpTags(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const err = result.current.error;
    expect(err).toBeInstanceOf(AppError);
    expect(err?.message).toMatch(/HTTP 403/);
    expect((err as AppError).params?.status).toBe("403");
  });
});
