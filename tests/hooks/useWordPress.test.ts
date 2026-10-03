import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSettingsStore } from "@/stores/settingsStore";
import { normalizeRawPost, resolveEmbedded, useWordPress } from "@/hooks/useWordPress";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe("resolveEmbedded", () => {
  it("returns undefined for null input", () => {
    expect(resolveEmbedded(null)).toBeUndefined();
  });

  it("returns undefined for non-object input", () => {
    expect(resolveEmbedded("string")).toBeUndefined();
    expect(resolveEmbedded(42)).toBeUndefined();
    expect(resolveEmbedded(undefined)).toBeUndefined();
  });

  it("returns all-undefined fields for empty object", () => {
    const result = resolveEmbedded({});
    expect(result?.author).toBeUndefined();
    expect(result?.["wp:featuredmedia"]).toBeUndefined();
    expect(result?.["wp:term"]).toBeUndefined();
  });

  it("filters non-object entries from author array", () => {
    const result = resolveEmbedded({
      author: [null, "string", 42, { name: "Valid Author" }, { name: 123 }],
    });
    expect(result?.author).toHaveLength(2);
    expect(result?.author?.[0]?.name).toBe("Valid Author");
    expect(result?.author?.[1]?.name).toBe("");
  });

  it("filters wp:featuredmedia entries without source_url", () => {
    const result = resolveEmbedded({
      "wp:featuredmedia": [
        { source_url: "https://img.jpg" },
        { id: 1 },
        null,
        { source_url: "https://other.png" },
      ],
    });
    expect(result?.["wp:featuredmedia"]).toHaveLength(2);
    expect(result?.["wp:featuredmedia"]?.[0]?.source_url).toBe("https://img.jpg");
    expect(result?.["wp:featuredmedia"]?.[1]?.source_url).toBe("https://other.png");
  });

  it("filters wp:term nested arrays", () => {
    const result = resolveEmbedded({
      "wp:term": [
        [{ name: "Tag1" }, null, { name: "Tag2" }],
        "not-an-array",
        [{ id: 1 }],
      ],
    });
    expect(result?.["wp:term"]).toHaveLength(2);
    expect(result?.["wp:term"]?.[0]).toHaveLength(2);
    expect(result?.["wp:term"]?.[0]?.[0]?.name).toBe("Tag1");
  });

  it("returns undefined for author when not an array", () => {
    const result = resolveEmbedded({ author: "not-array" });
    expect(result?.author).toBeUndefined();
  });

  it("preserves media_details with width, height, and sizes (regression #580)", () => {
    const result = resolveEmbedded({
      "wp:featuredmedia": [{
        source_url: "https://example.com/full.jpg",
        alt_text: "Test image",
        media_details: {
          width: 1600,
          height: 900,
          sizes: {
            thumbnail: { source_url: "https://example.com/thumb.jpg", width: 150, height: 84 },
            medium: { source_url: "https://example.com/med.jpg", width: 300, height: 169 },
          },
        },
      }],
    });
    const media = result?.["wp:featuredmedia"]?.[0];
    expect(media?.source_url).toBe("https://example.com/full.jpg");
    expect(media?.alt_text).toBe("Test image");
    expect(media?.media_details?.width).toBe(1600);
    expect(media?.media_details?.height).toBe(900);
    expect(media?.media_details?.sizes?.thumbnail?.source_url).toBe("https://example.com/thumb.jpg");
    expect(media?.media_details?.sizes?.thumbnail?.width).toBe(150);
    expect(media?.media_details?.sizes?.medium?.source_url).toBe("https://example.com/med.jpg");
    expect(media?.media_details?.sizes?.medium?.width).toBe(300);
  });
});

describe("normalizeRawPost", () => {
  it("normalizes a raw post with all fields", () => {
    const raw = { id: 42, date: "2026-01-01", title: { rendered: "Hello World" }, content: { rendered: "<p>Content</p>" }, excerpt: { rendered: "Excerpt" }, name: "hello-world", source_url: "https://example.com/img.jpg", media_type: "image" };
    const result = normalizeRawPost(raw);
    expect(result.id).toBe(42);
    expect(result.title).toBe("Hello World");
    expect(result.content).toBe("<p>Content</p>");
  });

  it("handles plain string title", () => {
    const result = normalizeRawPost({ id: 1, title: "Plain Title" });
    expect(result.title).toBe("Plain Title");
  });

  it("defaults id to 0 when not a number", () => {
    const result = normalizeRawPost({ id: "not-a-number", title: "Test" });
    expect(result.id).toBe(0);
  });

  it("defaults date to undefined when not a string", () => {
    const result = normalizeRawPost({ id: 1, title: "Test", date: 12345 });
    expect(result.date).toBeUndefined();
  });

  it("handles missing optional fields", () => {
    const result = normalizeRawPost({ id: 1, title: "Minimal" });
    expect(result.content).toBeUndefined();
    expect(result.excerpt).toBeUndefined();
    expect(result.description).toBeUndefined();
    expect(result.caption).toBeUndefined();
    expect(result.name).toBeUndefined();
    expect(result.source_url).toBeUndefined();
    expect(result.media_type).toBeUndefined();
  });

  it("handles description and caption fields", () => {
    const result = normalizeRawPost({ id: 1, title: "Test", description: { rendered: "Desc" }, caption: "Caption text" });
    expect(result.description).toBe("Desc");
    expect(result.caption).toBe("Caption text");
  });

  it("preserves _embedded data", () => {
    const embedded = { author: [{ name: "Author" }] };
    const result = normalizeRawPost({ id: 1, title: "Test", _embedded: embedded });
    expect(result._embedded).toEqual(embedded);
  });

  it("defaults all fields for empty object (regression #588)", () => {
    const result = normalizeRawPost({});
    expect(result.id).toBe(0);
    expect(result.title).toBe("");
    expect(result.date).toBeUndefined();
    expect(result.content).toBeUndefined();
  });

  it("coerces wrong field types to defaults (regression #588)", () => {
    const result = normalizeRawPost({ id: "abc", date: 123, name: 456, source_url: true, media_type: [] });
    expect(result.id).toBe(0);
    expect(result.date).toBeUndefined();
    expect(result.name).toBeUndefined();
    expect(result.source_url).toBeUndefined();
    expect(result.media_type).toBeUndefined();
  });
});

describe("useWordPress hook", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    useSettingsStore.setState({ wpUrl: "https://test.example.com", contentType: "posts", perPage: 20, useProxy: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("is disabled when wpUrl is empty", () => {
    useSettingsStore.setState({ wpUrl: "" });
    const { result } = renderHook(() => useWordPress(1), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it("fetches and parses posts", async () => {
    const posts = [{ id: 1, title: { rendered: "First" }, date: "2026-01-01T00:00:00" }, { id: 2, title: { rendered: "Second" }, date: "2026-02-01T00:00:00" }];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(posts), { status: 200, headers: { "X-WP-TotalPages": "5", "X-WP-Total": "42" } })));
    const { result } = renderHook(() => useWordPress(1), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.posts).toHaveLength(2);
    expect(result.current.data?.posts[0]?.title).toBe("First");
    expect(result.current.data?.totalPages).toBe(5);
    expect(result.current.data?.totalPosts).toBe(42);
  });

  it("defaults totalPages to 1 when header is missing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: 1, title: "A" }]), { status: 200 })));
    const { result } = renderHook(() => useWordPress(1), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalPages).toBe(1);
  });

  it("handles HTTP error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Not Found", { status: 404 })));
    const { result } = renderHook(() => useWordPress(1), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("falls back to normalizeRawPost when Zod parse fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: "not-a-number", title: { rendered: "Fallback" }, date: "2026-01-01" }]), { status: 200, headers: { "X-WP-Total": "1" } })));
    const { result } = renderHook(() => useWordPress(1), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(warnSpy).toHaveBeenCalled();
    expect(result.current.data?.posts[0]?.title).toBe("Fallback");
    expect(result.current.data?.posts[0]?.id).toBe(0);
    warnSpy.mockRestore();
  });

  it("throws when response is not an array", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "invalid" }), { status: 200 })));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = renderHook(() => useWordPress(1), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("expected an array");
    warnSpy.mockRestore();
  });

  it("uses correct content type in URL", async () => {
    useSettingsStore.setState({ contentType: "pages" });
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", mockFetch);
    const { result } = renderHook(() => useWordPress(1), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect((mockFetch.mock.calls[0]?.[0] as string)).toContain("/pages?");
  });

  it("includes page and perPage in request", async () => {
    useSettingsStore.setState({ perPage: 50 });
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", mockFetch);
    const { result } = renderHook(() => useWordPress(3), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const url = mockFetch.mock.calls[0]?.[0] as string;
    expect(url).toContain("per_page=50");
    expect(url).toContain("page=3");
  });

  it("uses totalPosts from parsed data length when header returns 0", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: 1, title: { rendered: "A" } }, { id: 2, title: { rendered: "B" } }]), { status: 200, headers: { "X-WP-Total": "0" } })));
    const { result } = renderHook(() => useWordPress(1), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalPosts).toBe(2);
  });

  it("reads lowercase header variants", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: 1, title: "Test" }]), { status: 200, headers: { "x-wp-totalpages": "7", "x-wp-total": "35" } })));
    const { result } = renderHook(() => useWordPress(1), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalPages).toBe(7);
    expect(result.current.data?.totalPosts).toBe(35);
  });

  it("refetches when useProxy changes (Issue #93)", async () => {
    const makeResponse = () => new Response(JSON.stringify([{ id: 1, title: { rendered: "A" }, date: "2026-01-01" }]), { status: 200, headers: { "X-WP-TotalPages": "1", "X-WP-Total": "1" } });
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(makeResponse()));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useWordPress(1), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    act(() => { useSettingsStore.setState({ useProxy: true }); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("infers totalPages from array length when headers are stripped (regression #178)", async () => {
    const posts = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, title: { rendered: `Post ${i + 1}` }, date: "2026-01-01T00:00:00" }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(posts), { status: 200 })));
    const { result } = renderHook(() => useWordPress(2), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalPages).toBe(3);
    expect(result.current.data?.totalPosts).toBe(20);
  });

  it("infers last page when fewer items than perPage and headers are stripped (regression #178)", async () => {
    const posts = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, title: { rendered: `Post ${i + 1}` }, date: "2026-01-01T00:00:00" }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(posts), { status: 200 })));
    const { result } = renderHook(() => useWordPress(2), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalPages).toBe(2);
    expect(result.current.data?.totalPosts).toBe(5);
  });

  it("forwards TanStack Query signal to fetchWithProxy (regression #205)", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: 1, title: { rendered: "A" }, date: "2026-01-01" }]), { status: 200, headers: { "X-WP-TotalPages": "1", "X-WP-Total": "1" } }));
    vi.stubGlobal("fetch", mockFetch);
    const { result } = renderHook(() => useWordPress(1), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch.mock.calls[0][1]).toHaveProperty("signal");
    expect(mockFetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it("passes orderby and order parameters (regression #276)", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", mockFetch);
    const { result } = renderHook(() => useWordPress(1, "", "title", "asc"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const url = mockFetch.mock.calls[0]?.[0] as string;
    expect(url).toContain("orderby=title");
    expect(url).toContain("order=asc");
  });

  it("uses default date/desc sort when parameters omitted (regression #276)", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", mockFetch);
    const { result } = renderHook(() => useWordPress(1), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const url = mockFetch.mock.calls[0]?.[0] as string;
    expect(url).toContain("orderby=date");
    expect(url).toContain("order=desc");
  });

  it("list query URL must not use _fields to preserve _embed resolution (regression #498)", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", mockFetch);
    const { result } = renderHook(() => useWordPress(1), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const url = mockFetch.mock.calls[0]?.[0] as string;
    expect(url).not.toContain("_fields=");
    expect(url).toContain("_embed");
  });

  it("disables query when enabled is false (regression #437)", () => {
    const { result } = renderHook(() => useWordPress(1, "", "date", "desc", [], false), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.data).toBeUndefined();
  });

  it("defaults enabled to true when omitted (regression #437)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 })));
    const { result } = renderHook(() => useWordPress(1), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("appends tags parameter to URL when tags are provided (regression #156)", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", mockFetch);
    const { result } = renderHook(() => useWordPress(1, "", "date", "desc", [5, 12, 23]), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const parsed = new URL(mockFetch.mock.calls[0]?.[0] as string);
    expect(parsed.searchParams.get("tags")).toBe("5,12,23");
  });

  it("does not append tags parameter when tags array is empty (regression #156)", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", mockFetch);
    const { result } = renderHook(() => useWordPress(1, "", "date", "desc", []), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const parsed = new URL(mockFetch.mock.calls[0]?.[0] as string);
    expect(parsed.searchParams.has("tags")).toBe(false);
  });
});
