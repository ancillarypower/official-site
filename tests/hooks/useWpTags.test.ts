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
  wpBuildUrl: (apiBase: string, endpoint: string, params: Record<string, string> = {}) => {
    const url = new URL(`${apiBase}/${endpoint}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    return url.toString();
  },
  parseJsonResponse: (res: Response) => res.json(),
}));

import { wpTagArraySchema, fetchAllWpTags } from "@/hooks/useWpTags";
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
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: new Headers(headers),
  });
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

    const signal = new AbortController().signal;
    const result = await fetchAllWpTags(
      "https://example.com/wp-json/wp/v2",
      false,
      signal,
    );

    // Should have fetched 3 pages
    expect(mockFetch).toHaveBeenCalledTimes(3);

    // Verify page parameters in URLs
    const urls = mockFetch.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(urls[0]).toContain("page=1");
    expect(urls[1]).toContain("page=2");
    expect(urls[2]).toContain("page=3");

    // Should return all 300 tags
    expect(result).toHaveLength(300);
    expect(result[0]!.id).toBe(1);
    expect(result[299]!.id).toBe(300);
  });

  it("infers more pages from response length when headers are stripped by proxy (regression #552)", async () => {
    // Page 1: 100 tags (full page -> infer more)
    // Page 2: 50 tags (short page -> stop)
    const page1 = fakeTags(WP_MAX_PER_PAGE, 1);
    const page2 = fakeTags(50, 101);

    // No X-WP-TotalPages header (proxy stripped it)
    mockFetch
      .mockResolvedValueOnce(jsonResponse(page1))
      .mockResolvedValueOnce(jsonResponse(page2));

    const signal = new AbortController().signal;
    const result = await fetchAllWpTags(
      "https://example.com/wp-json/wp/v2",
      false,
      signal,
    );

    // Should have fetched exactly 2 pages (stopped at short page)
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Should return all 150 tags
    expect(result).toHaveLength(150);
    expect(result[0]!.id).toBe(1);
    expect(result[149]!.id).toBe(150);
  });
});
