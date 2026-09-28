import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock settingsStore before importing the hook
const mockStore = { wpUrl: "https://example.com", contentType: "posts", useProxy: false };
vi.mock("@/stores/settingsStore", () => ({
  useSettingsStore: (selector: (s: typeof mockStore) => unknown) => selector(mockStore),
}));

// Mock fetchWithProxy and related API utilities
const mockFetch = vi.fn();
vi.mock("@/lib/api", () => ({
  fetchWithProxy: (...args: unknown[]) => mockFetch(...args),
  wpApiUrl: (url: string) => `${url}/wp-json/wp/v2`,
  parseJsonResponse: (res: Response) => res.json(),
}));

import { wpTagArraySchema, useWpTags } from "@/hooks/useWpTags";
import { WP_MAX_PER_PAGE } from "@/lib/constants";

/** Generate an array of N fake tags. */
function fakeTags(count: number, startId = 1) {
  return Array.from({ length: count }, (_, i) => ({
    id: startId + i,
    name: `Tag ${startId + i}`,
    count: i,
  }));
}

/** Build a minimal Response whose .json() resolves to `body`. */
function jsonResponse(
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  const res = new Response(JSON.stringify(body), {
    status: 200,
    headers: new Headers(headers),
  });
  return res;
}

describe("useWpTags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.wpUrl = "https://example.com";
    mockStore.contentType = "posts";
    mockStore.useProxy = false;
  });

  it("wpTagArraySchema parses valid tag array", () => {
    const input = [
      { id: 1, name: "React", count: 5 },
      { id: 2, name: "TypeScript", count: 3 },
      { id: 3, name: "Vite" },
    ];
    const result = wpTagArraySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toEqual({ id: 1, name: "React", count: 5 });
      expect(result.data[2]).toEqual({ id: 3, name: "Vite" });
    }
  });

  it("wpTagArraySchema rejects invalid entries", () => {
    const input = [
      { id: "not-a-number", name: "Bad" },
      { name: "Missing ID" },
    ];
    const result = wpTagArraySchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("fetches all pages when X-WP-TotalPages indicates multiple pages (regression #552)", async () => {
    // 3 pages of 100 tags each = 300 total
    const page1 = fakeTags(WP_MAX_PER_PAGE, 1);
    const page2 = fakeTags(WP_MAX_PER_PAGE, 101);
    const page3 = fakeTags(WP_MAX_PER_PAGE, 201);

    mockFetch
      .mockResolvedValueOnce(
        jsonResponse(page1, { "X-WP-TotalPages": "3" }),
      )
      .mockResolvedValueOnce(
        jsonResponse(page2, { "X-WP-TotalPages": "3" }),
      )
      .mockResolvedValueOnce(
        jsonResponse(page3, { "X-WP-TotalPages": "3" }),
      );

    // Extract queryFn by inspecting useWpTags return shape.
    // We call the hook's queryFn directly since renderHook would
    // require a full QueryClientProvider setup.
    // Instead, re-import the module and call queryFn via the query options.
    const { useWpTags: hook } = await import("@/hooks/useWpTags");

    // useWpTags returns useQuery(...), but we need the queryFn.
    // Since TanStack Query's useQuery cannot be called outside React,
    // we test the fetch logic by driving mockFetch and verifying calls.
    // The hook is structured so queryFn is the only consumer of fetchWithProxy.
    // We simulate what queryFn does by triggering it through the mock.

    // Direct approach: call the queryFn extracted from the hook options.
    // useQuery receives an options object; we can intercept it.
    const useQuerySpy = vi.fn();
    vi.doMock("@tanstack/react-query", () => ({
      useQuery: (opts: Record<string, unknown>) => {
        useQuerySpy(opts);
        return { data: undefined, isLoading: true };
      },
    }));

    // Re-import to pick up the mocked useQuery
    const freshModule = await import("@/hooks/useWpTags");
    freshModule.useWpTags();

    expect(useQuerySpy).toHaveBeenCalledTimes(1);
    const queryOpts = useQuerySpy.mock.calls[0]![0] as { queryFn: (ctx: { signal: AbortSignal }) => Promise<unknown> };
    const result = await queryOpts.queryFn({ signal: new AbortController().signal });

    // Should have fetched 3 pages
    expect(mockFetch).toHaveBeenCalledTimes(3);

    // Verify page parameters in URLs
    const urls = mockFetch.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(urls[0]).toContain("page=1");
    expect(urls[1]).toContain("page=2");
    expect(urls[2]).toContain("page=3");

    // Should return all 300 tags
    expect(Array.isArray(result)).toBe(true);
    expect((result as unknown[]).length).toBe(300);

    // Restore original mock
    vi.doUnmock("@tanstack/react-query");
  });

  it("infers more pages from response length when headers are stripped by proxy (regression #552)", async () => {
    // Page 1: 100 tags (full page → infer more)
    // Page 2: 50 tags (short page → stop)
    const page1 = fakeTags(WP_MAX_PER_PAGE, 1);
    const page2 = fakeTags(50, 101);

    // No X-WP-TotalPages header (proxy stripped it)
    mockFetch
      .mockResolvedValueOnce(jsonResponse(page1))
      .mockResolvedValueOnce(jsonResponse(page2));

    const useQuerySpy = vi.fn();
    vi.doMock("@tanstack/react-query", () => ({
      useQuery: (opts: Record<string, unknown>) => {
        useQuerySpy(opts);
        return { data: undefined, isLoading: true };
      },
    }));

    const freshModule = await import("@/hooks/useWpTags");
    freshModule.useWpTags();

    expect(useQuerySpy).toHaveBeenCalledTimes(1);
    const queryOpts = useQuerySpy.mock.calls[0]![0] as { queryFn: (ctx: { signal: AbortSignal }) => Promise<unknown> };
    const result = await queryOpts.queryFn({ signal: new AbortController().signal });

    // Should have fetched exactly 2 pages (stopped at short page)
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Should return all 150 tags
    expect(Array.isArray(result)).toBe(true);
    expect((result as unknown[]).length).toBe(150);

    vi.doUnmock("@tanstack/react-query");
  });
});
