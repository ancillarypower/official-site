import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchWithProxy, wpApiUrl, wooApiUrl } from "@/lib/api";

describe("wpApiUrl", () => {
  it("builds correct URL from site URL", () => {
    expect(wpApiUrl("https://example.com")).toBe(
      "https://example.com/wp-json/wp/v2",
    );
  });

  it("strips trailing slashes", () => {
    expect(wpApiUrl("https://example.com///")).toBe(
      "https://example.com/wp-json/wp/v2",
    );
  });

  it("adds https if missing", () => {
    expect(wpApiUrl("example.com")).toBe(
      "https://example.com/wp-json/wp/v2",
    );
  });

  it("handles URL with path", () => {
    expect(wpApiUrl("https://example.com/blog")).toBe(
      "https://example.com/blog/wp-json/wp/v2",
    );
  });
});

describe("wooApiUrl", () => {
  it("builds correct URL with auth params", () => {
    const url = wooApiUrl("https://shop.com", "products", "ck_key", "cs_secret", {
      per_page: "10",
    });
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/wp-json/wc/v3/products");
    expect(parsed.searchParams.get("consumer_key")).toBe("ck_key");
    expect(parsed.searchParams.get("consumer_secret")).toBe("cs_secret");
    expect(parsed.searchParams.get("per_page")).toBe("10");
  });

  it("strips trailing slashes from base URL", () => {
    const url = wooApiUrl("https://shop.com//", "orders", "k", "s");
    expect(new URL(url).pathname).toBe("/wp-json/wc/v3/orders");
  });

  it("works with no extra params", () => {
    const url = wooApiUrl("https://shop.com", "products", "k", "s");
    const parsed = new URL(url);
    expect(parsed.searchParams.get("consumer_key")).toBe("k");
    expect(parsed.searchParams.get("consumer_secret")).toBe("s");
  });

  it("handles special characters in credentials", () => {
    const url = wooApiUrl("https://shop.com", "products", "ck_a&b=c", "cs_d+e");
    const parsed = new URL(url);
    expect(parsed.searchParams.get("consumer_key")).toBe("ck_a&b=c");
    expect(parsed.searchParams.get("consumer_secret")).toBe("cs_d+e");
  });
});

describe("fetchWithProxy", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches directly when proxy is disabled", async () => {
    const mockResponse = new Response("ok", { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const result = await fetchWithProxy("https://api.test.com/data", false);
    expect(result.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith("https://api.test.com/data");
  });

  it("tries CORS proxies when proxy is enabled", async () => {
    const mockResponse = new Response("ok", { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const result = await fetchWithProxy("https://api.test.com/data", true);
    expect(result.status).toBe(200);
    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain(encodeURIComponent("https://api.test.com/data"));
  });

  it("throws when all proxies fail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    await expect(
      fetchWithProxy("https://api.test.com/data", true),
    ).rejects.toThrow("All CORS proxies failed");
  });

  it("returns 404 responses without trying next proxy", async () => {
    const notFound = new Response("Not Found", { status: 404 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(notFound));

    const result = await fetchWithProxy("https://api.test.com/missing", true);
    expect(result.status).toBe(404);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
