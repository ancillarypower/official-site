import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSettingsStore } from "@/stores/settingsStore";
import { useWordPress } from "@/hooks/useWordPress";
import type { ContentType } from "@/lib/constants";

// Regression #598: WP REST taxonomy term endpoints (/wp/v2/categories,
// /wp/v2/tags) only accept these orderby values. Sending orderby=date or
// orderby=title returns 400 rest_invalid_param, so the list always fails.
const WP_TERM_ORDERBY = ["id", "include", "name", "slug", "include_slugs", "term_group", "description", "count"];

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, children);
  };
}

async function requestedUrl(contentType: ContentType, orderby?: string, order = "desc"): Promise<URL> {
  useSettingsStore.setState({ contentType });
  const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
  vi.stubGlobal("fetch", mockFetch);
  const { result } = orderby === undefined
    ? renderHook(() => useWordPress(1), { wrapper: createWrapper() })
    : renderHook(() => useWordPress(1, "", orderby, order), { wrapper: createWrapper() });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  return new URL(mockFetch.mock.calls[0]?.[0] as string);
}

describe("useWordPress orderby for term content types (regression #598)", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    useSettingsStore.setState({ wpUrl: "https://test.example.com", contentType: "posts", perPage: 20, useProxy: false });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(["categories", "tags"] as const)("%s: default request uses a valid term orderby", async (contentType) => {
    const url = await requestedUrl(contentType);
    expect(WP_TERM_ORDERBY).toContain(url.searchParams.get("orderby"));
    expect(url.searchParams.get("orderby")).toBe("name");
  });

  it.each(["categories", "tags"] as const)("%s: orderby=date is rewritten to name", async (contentType) => {
    const url = await requestedUrl(contentType, "date");
    expect(url.searchParams.get("orderby")).toBe("name");
  });

  it.each(["categories", "tags"] as const)("%s: orderby=title is rewritten to name", async (contentType) => {
    const url = await requestedUrl(contentType, "title", "asc");
    expect(url.searchParams.get("orderby")).toBe("name");
    expect(url.searchParams.get("order")).toBe("asc");
  });

  it("passes valid term orderby values through unchanged", async () => {
    const url = await requestedUrl("categories", "count", "desc");
    expect(url.searchParams.get("orderby")).toBe("count");
    expect(url.searchParams.get("order")).toBe("desc");
  });

  it.each(["posts", "pages", "media"] as const)("%s: date/title orderby is left untouched", async (contentType) => {
    expect((await requestedUrl(contentType, "date")).searchParams.get("orderby")).toBe("date");
    vi.unstubAllGlobals();
    expect((await requestedUrl(contentType, "title", "asc")).searchParams.get("orderby")).toBe("title");
  });
});
