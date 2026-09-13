import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
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
    useSettingsStore.setState({
      wpUrl: "https://test.example.com",
      contentType: "posts",
      perPage: 20,
      useProxy: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    // Posts with valid structure but extra unexpected fields that might trip Zod
    const posts = [
      { id: 1, title: { rendered: "Fallback" }, unexpected_field: true },
    ];
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
    expect(result.current.data?.posts).toBeDefined();
    expect(result.current.data?.posts[0]?.title).toBe("Fallback");
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
});
