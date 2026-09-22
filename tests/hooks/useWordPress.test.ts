import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSettingsStore } from "@/stores/settingsStore";
import { normalizeRawPost, useWordPress } from "@/hooks/useWordPress";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe("normalizeRawPost", () => {
  it("normalizes a raw post with all fields", () => {
    const raw = {
      id: 42,
      date: "2026-01-01",
      title: { rendered: "Hello World" },
      content: { rendered: "<p>Content</p>" },
      excerpt: { rendered: "Excerpt" },
      name: "hello-world",
      source_url: "https://example.com/img.jpg",
      media_type: "image",
    };
    const result = normalizeRawPost(raw);
    expect(result.id).toBe(42);
    expect(result.date).toBe("2026-01-01");
    expect(result.title).toBe("Hello World");
    expect(result.content).toBe("<p>Content</p>");
    expect(result.excerpt).toBe("Excerpt");
    expect(result.name).toBe("hello-world");
    expect(result.source_url).toBe("https://example.com/img.jpg");
    expect(result.media_type).toBe("image");
  });

  it("handles plain string title", () => {
    const raw = { id: 1, title: "Plain Title" };
    const result = normalizeRawPost(raw);
    expect(result.title).toBe("Plain Title");
  });

  it("defaults id to 0 when not a number", () => {
    const raw = { id: "not-a-number", title: "Test" };
    const result = normalizeRawPost(raw);
    expect(result.id).toBe(0);
  });

  it("defaults date to undefined when not a string", () => {
    const raw = { id: 1, title: "Test", date: 12345 };
    const result = normalizeRawPost(raw);
    expect(result.date).toBeUndefined();
  });

  it("handles missing optional fields", () => {
    const raw = { id: 1, title: "Minimal" };
    const result = normalizeRawPost(raw);
    expect(result.content).toBeUndefined();
    expect(result.excerpt).toBeUndefined();
    expect(result.description).toBeUndefined();
    expect(result.caption).toBeUndefined();
    expect(result.name).toBeUndefined();
    expect(result.source_url).toBeUndefined();
    expect(result.media_type).toBeUndefined();
  });

  it("handles description and caption fields", () => {
    const raw = {
      id: 1,
      title: "Test",
      description: { rendered: "Desc" },
      caption: "Caption text",
    };
    const result = normalizeRawPost(raw);
    expect(result.description).toBe("Desc");
    expect(result.caption).toBe("Caption text");
  });

  it("preserves _embedded data", () => {
    const embedded = { author: [{ name: "Author" }] };
    const raw = { id: 1, title: "Test", _embedded: embedded };
    const result = normalizeRawPost(raw);
    expect(result._embedded).toEqual(embedded);
  });
});

describe("useWordPress hook", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    useSettingsStore.setState({
      wpUrl: "https://test.example.com",
      contentType: "posts",
      perPage: 20,
      useProxy: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("is disabled when wpUrl is empty", () => {
    useSettingsStore.setState({ wpUrl: "" });
    const { result } = renderHook(() => useWordPress(1), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it("fetches and parses posts", async () => {
    const posts = [
      { id: 1, title: { rendered: "First" }, date: "2026-01-01T00:00:00" },
      { id: 2, title: { rendered: "Second" }, date: "2026-02-01T00:00:00" },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify(posts), {
        status: 200,
        headers: { "X-WP-TotalPages": "5", "X-WP-Total": "42" },
      }),
    ));

    const { result } = renderHook(() => useWordPress(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.posts).toHaveLength(2);
    expect(result.current.data?.posts[0]?.title).toBe("First");
    expect(result.current.data?.totalPages).toBe(5);
    expect(result.current.data?.totalPosts).toBe(42);
  });

  it("defaults totalPages to 1 when header is missing", async () => {
    const posts = [{ id: 1, title: "A" }];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify(posts), { status: 200 }),
    ));

    const { result } = renderHook(() => useWordPress(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalPages).toBe(1);
  });

  it("handles HTTP error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("Not Found", { status: 404 }),
    ));

    const { result } = renderHook(() => useWordPress(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("falls back to normalizeRawPost when Zod parse fails", async () => {
    // Use a string id so wpPostSchema.safeParse fails (id must be number)
    const posts = [
      { id: "not-a-number", title: { rendered: "Fallback" }, date: "2026-01-01" },
    ];
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify(posts), {
        status: 200,
        headers: { "X-WP-Total": "1" },
      }),
    ));

    const { result } = renderHook(() => useWordPress(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(warnSpy).toHaveBeenCalled();
    expect(result.current.data?.posts).toBeDefined();
    expect(result.current.data?.posts[0]?.title).toBe("Fallback");
    expect(result.current.data?.posts[0]?.id).toBe(0);
    warnSpy.mockRestore();
  });

  it("throws when response is not an array", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "invalid" }), { status: 200 }),
    ));

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { result } = renderHook(() => useWordPress(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("expected an array");
    warnSpy.mockRestore();
  });

  it("uses correct content type in URL", async () => {
    useSettingsStore.setState({ contentType: "pages" });
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useWordPress(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("/pages?");
  });

  it("includes page and perPage in request", async () => {
    useSettingsStore.setState({ perPage: 50 });
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useWordPress(3), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("per_page=50");
    expect(calledUrl).toContain("page=3");
  });

  it("uses totalPosts from parsed data length when header returns 0", async () => {
    const posts = [
      { id: 1, title: { rendered: "A" } },
      { id: 2, title: { rendered: "B" } },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify(posts), {
        status: 200,
        headers: { "X-WP-Total": "0" },
      }),
    ));

    const { result } = renderHook(() => useWordPress(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalPosts).toBe(2);
  });

  it("reads lowercase header variants", async () => {
    const posts = [{ id: 1, title: "Test" }];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify(posts), {
        status: 200,
        headers: { "x-wp-totalpages": "7", "x-wp-total": "35" },
      }),
    ));

    const { result } = renderHook(() => useWordPress(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalPages).toBe(7);
    expect(result.current.data?.totalPosts).toBe(35);
  });

  it("refetches when useProxy changes (Issue #93)", async () => {
    const makeResponse = () =>
      new Response(
        JSON.stringify([{ id: 1, title: { rendered: "A" }, date: "2026-01-01" }]),
        { status: 200, headers: { "X-WP-TotalPages": "1", "X-WP-Total": "1" } },
      );
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(makeResponse()));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useWordPress(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Toggle proxy — queryKey must include useProxy so this triggers refetch
    act(() => {
      useSettingsStore.setState({ useProxy: true });
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("infers totalPages from array length when headers are stripped (regression #178)", async () => {
    // Simulate CORS proxy stripping X-WP-TotalPages / X-WP-Total headers.
    // Return exactly perPage (20) items so the heuristic infers a next page.
    const posts = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      title: { rendered: `Post ${i + 1}` },
      date: "2026-01-01T00:00:00",
    }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify(posts), { status: 200 }),
    ));

    const { result } = renderHook(() => useWordPress(2), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // 20 items returned = perPage => totalPages = page + 1 = 3
    expect(result.current.data?.totalPages).toBe(3);
    expect(result.current.data?.totalPosts).toBe(20);
  });

  it("infers last page when fewer items than perPage and headers are stripped (regression #178)", async () => {
    // Simulate CORS proxy stripping headers.
    // Return fewer than perPage (20) items so the heuristic infers this is the last page.
    const posts = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      title: { rendered: `Post ${i + 1}` },
      date: "2026-01-01T00:00:00",
    }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify(posts), { status: 200 }),
    ));

    const { result } = renderHook(() => useWordPress(2), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // 5 items returned < perPage (20) => totalPages = page = 2
    expect(result.current.data?.totalPages).toBe(2);
    expect(result.current.data?.totalPosts).toBe(5);
  });

  it("forwards TanStack Query signal to fetchWithProxy (regression #205)", async () => {
    const posts = [{ id: 1, title: { rendered: "A" }, date: "2026-01-01" }];
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(posts), {
        status: 200,
        headers: { "X-WP-TotalPages": "1", "X-WP-Total": "1" },
      }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useWordPress(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // fetchWithProxy is called with init containing signal from TanStack Query.
    // buildSignal merges it with the timeout, so the actual fetch receives
    // a composite AbortSignal instance.
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1]).toHaveProperty("signal");
    expect(callArgs[1].signal).toBeInstanceOf(AbortSignal);
  });

  it("passes orderby and order parameters to WordPress REST API URL (regression #276)", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useWordPress(1, "", "title", "asc"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("orderby=title");
    expect(calledUrl).toContain("order=asc");
  });

  it("uses default date/desc sort when parameters omitted (regression #276)", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useWordPress(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("orderby=date");
    expect(calledUrl).toContain("order=desc");
  });
});
