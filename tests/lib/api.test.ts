import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchWithProxy, wpApiUrl, wooApiUrl } from "@/lib/api";

describe("wpApiUrl", () => {
  it("builds URL from a bare domain", () => {
    expect(wpApiUrl("example.com")).toBe("https://example.com/wp-json/wp/v2");
  });

  it("preserves existing http protocol", () => {
    expect(wpApiUrl("http://example.com")).toBe(
      "http://example.com/wp-json/wp/v2",
    );
  });

  it("preserves existing https protocol", () => {
    expect(wpApiUrl("https://example.com")).toBe(
      "https://example.com/wp-json/wp/v2",
    );
  });

  it("strips trailing slashes", () => {
    expect(wpApiUrl("https://example.com///")).toBe(
      "https://example.com/wp-json/wp/v2",
    );
  });

  it("trims whitespace", () => {
    expect(wpApiUrl("  https://example.com  ")).toBe(
      "https://example.com/wp-json/wp/v2",
    );
  });
});

describe("wooApiUrl", () => {
  it("builds URL with auth params", () => {
    const url = wooApiUrl(
      "https://shop.com",
      "products",
      "ck_abc",
      "cs_xyz",
    );
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/wp-json/wc/v3/products");
    expect(parsed.searchParams.get("consumer_key")).toBe("ck_abc");
    expect(parsed.searchParams.get("consumer_secret")).toBe("cs_xyz");
  });

  it("includes extra params", () => {
    const url = wooApiUrl("https://shop.com", "products", "k", "s", {
      per_page: "10",
      page: "2",
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("per_page")).toBe("10");
    expect(parsed.searchParams.get("page")).toBe("2");
  });

  it("strips trailing slashes from base", () => {
    const url = wooApiUrl("https://shop.com///", "orders", "k", "s");
    expect(url).toContain("shop.com/wp-json/wc/v3/orders");
  });

  it("builds correct URL for orders endpoint", () => {
    const url = wooApiUrl("https://shop.com", "orders", "ck_1", "cs_2");
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/wp-json/wc/v3/orders");
  });
});

describe("fetchWithProxy", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls fetch directly when useProxy is false", async () => {
    const mockResponse = new Response("ok", { status: 200 });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockResponse);

    const result = await fetchWithProxy("https://example.com/api", false);
    expect(result).toBe(mockResponse);
    expect(fetch).toHaveBeenCalledWith("https://example.com/api");
  });

  it("uses proxy when useProxy is true", async () => {
    const mockResponse = new Response("ok", { status: 200 });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockResponse);

    const result = await fetchWithProxy("https://example.com/api", true);
    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        encodeURIComponent("https://example.com/api"),
      ),
    );
  });

  it("tries next proxy on network failure", async () => {
    const mockResponse = new Response("ok", { status: 200 });
    vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(mockResponse);

    const result = await fetchWithProxy("https://example.com/api", true);
    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("tries next proxy on non-ok non-404 response", async () => {
    const badResponse = new Response("error", { status: 500 });
    const goodResponse = new Response("ok", { status: 200 });
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(badResponse)
      .mockResolvedValueOnce(goodResponse);

    const result = await fetchWithProxy("https://example.com/api", true);
    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("throws when all proxies fail", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("fail"));
    await expect(
      fetchWithProxy("https://example.com/api", true),
    ).rejects.toThrow("All CORS proxies failed");
  });

  it("accepts 404 as a valid proxy response", async () => {
    const mockResponse = new Response("not found", { status: 404 });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockResponse);

    const result = await fetchWithProxy("https://example.com/api", true);
    expect(result.status).toBe(404);
  });
});
