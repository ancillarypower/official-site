import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchWithProxy, wpApiUrl, wooApiUrl, wooAuthHeaders, wooAuthParams } from "@/lib/api";

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

  it("preserves http scheme", () => {
    expect(wpApiUrl("http://localhost:8080")).toBe(
      "http://localhost:8080/wp-json/wp/v2",
    );
  });

  it("handles whitespace around URL", () => {
    expect(wpApiUrl("  https://example.com  ")).toBe(
      "https://example.com/wp-json/wp/v2",
    );
  });
});

describe("wooApiUrl", () => {
  it("builds correct URL without credentials", () => {
    const url = wooApiUrl("https://shop.com", "products", {
      per_page: "10",
    });
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/wp-json/wc/v3/products");
    expect(parsed.searchParams.get("per_page")).toBe("10");
  });

  it("does not include consumer_key or consumer_secret by default", () => {
    const url = wooApiUrl("https://shop.com", "products");
    expect(url).not.toContain("consumer_key");
    expect(url).not.toContain("consumer_secret");
  });

  it("strips trailing slashes from base URL", () => {
    const url = wooApiUrl("https://shop.com//", "orders");
    expect(new URL(url).pathname).toBe("/wp-json/wc/v3/orders");
  });

  it("works with no extra params", () => {
    const url = wooApiUrl("https://shop.com", "products");
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/wp-json/wc/v3/products");
    expect([...parsed.searchParams.keys()]).toHaveLength(0);
  });

  it("handles multiple extra params", () => {
    const url = wooApiUrl("https://shop.com", "products", {
      per_page: "10",
      page: "2",
      orderby: "date",
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("per_page")).toBe("10");
    expect(parsed.searchParams.get("page")).toBe("2");
    expect(parsed.searchParams.get("orderby")).toBe("date");
  });

  it("can include auth params when explicitly spread", () => {
    const url = wooApiUrl("https://shop.com", "products", {
      ...wooAuthParams("ck_key", "cs_secret"),
      per_page: "10",
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("consumer_key")).toBe("ck_key");
    expect(parsed.searchParams.get("consumer_secret")).toBe("cs_secret");
    expect(parsed.searchParams.get("per_page")).toBe("10");
  });
});

describe("wooAuthHeaders", () => {
  it("returns Authorization header with Basic scheme", () => {
    const headers = wooAuthHeaders("ck_key", "cs_secret");
    expect(headers).toHaveProperty("Authorization");
    expect((headers as Record<string, string>).Authorization).toMatch(
      /^Basic /,
    );
  });

  it("encodes key:secret as base64", () => {
    const headers = wooAuthHeaders("ck_key", "cs_secret");
    const encoded = (headers as Record<string, string>).Authorization!.replace(
      "Basic ",
      "",
    );
    expect(atob(encoded)).toBe("ck_key:cs_secret");
  });

  it("handles special characters in credentials", () => {
    const headers = wooAuthHeaders("ck_a&b=c", "cs_d+e");
    const encoded = (headers as Record<string, string>).Authorization!.replace(
      "Basic ",
      "",
    );
    expect(atob(encoded)).toBe("ck_a&b=c:cs_d+e");
  });
});

describe("wooAuthParams", () => {
  it("returns consumer_key and consumer_secret", () => {
    const params = wooAuthParams("ck_key", "cs_secret");
    expect(params).toEqual({
      consumer_key: "ck_key",
      consumer_secret: "cs_secret",
    });
  });

  it("handles special characters in credentials", () => {
    const params = wooAuthParams("ck_a&b=c", "cs_d+e");
    expect(params.consumer_key).toBe("ck_a&b=c");
    expect(params.consumer_secret).toBe("cs_d+e");
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
    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[0]).toBe("https://api.test.com/data");
    expect(callArgs[1]).toHaveProperty("signal");
    expect(callArgs[1].signal).toBeInstanceOf(AbortSignal);
  });

  it("forwards init options in direct mode", async () => {
    const mockResponse = new Response("ok", { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const init: RequestInit = {
      headers: { Authorization: "Basic dGVzdA==" },
    };
    await fetchWithProxy("https://api.test.com/data", false, init);
    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[0]).toBe("https://api.test.com/data");
    expect(callArgs[1].headers).toEqual({ Authorization: "Basic dGVzdA==" });
    expect(callArgs[1].signal).toBeInstanceOf(AbortSignal);
  });

  it("tries CORS proxies when proxy is enabled", async () => {
    const mockResponse = new Response("ok", { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const result = await fetchWithProxy("https://api.test.com/data", true);
    expect(result.status).toBe(200);
    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain(encodeURIComponent("https://api.test.com/data"));
  });

  it("does not forward init in proxy mode", async () => {
    const mockResponse = new Response("ok", { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    await fetchWithProxy("https://api.test.com/data", true, {
      headers: { Authorization: "Basic dGVzdA==" },
    });
    // Proxy mode only passes the proxy URL + signal, no caller init
    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[0]).toContain("corsproxy");
    expect(callArgs[1]).toHaveProperty("signal");
    expect(callArgs[1]).not.toHaveProperty("headers");
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

  it("falls back to next proxy when first returns server error", async () => {
    const serverError = new Response("Error", { status: 500 });
    const okResponse = new Response("ok", { status: 200 });
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(serverError)
      .mockResolvedValueOnce(okResponse);
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchWithProxy("https://api.test.com/data", true);
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("falls back to next proxy when first throws", async () => {
    const okResponse = new Response("ok", { status: 200 });
    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce(okResponse);
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchWithProxy("https://api.test.com/data", true);
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  // --- Regression tests for Issue #43: credential leakage via CORS proxy ---

  it("throws when proxy mode URL contains consumer_key", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await expect(
      fetchWithProxy(
        "https://shop.com/wp-json/wc/v3/products?consumer_key=ck_xxx&consumer_secret=cs_xxx",
        true,
      ),
    ).rejects.toThrow("WooCommerce credentials must not be sent through CORS proxy");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("throws when proxy mode URL contains only consumer_secret", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await expect(
      fetchWithProxy(
        "https://shop.com/wp-json/wc/v3/products?consumer_secret=cs_xxx",
        true,
      ),
    ).rejects.toThrow("WooCommerce credentials must not be sent through CORS proxy");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("allows proxy mode URL without credentials", async () => {
    const mockResponse = new Response("ok", { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));
    const result = await fetchWithProxy(
      "https://shop.com/wp-json/wc/v3/products?per_page=10",
      true,
    );
    expect(result.status).toBe(200);
  });

  it("allows direct mode even if URL contains credential params", async () => {
    const mockResponse = new Response("ok", { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));
    const result = await fetchWithProxy(
      "https://shop.com/wp-json/wc/v3/products?consumer_key=ck_xxx",
      false,
    );
    expect(result.status).toBe(200);
    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1]).toHaveProperty("signal");
  });

  // --- Regression tests for Issue #47: fetch timeout ---

  it("attaches timeout signal in direct mode", async () => {
    const mockResponse = new Response("ok", { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    await fetchWithProxy("https://api.test.com/data", false);
    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1]).toBeDefined();
    expect(callArgs[1].signal).toBeInstanceOf(AbortSignal);
  });

  it("attaches timeout signal in proxy mode", async () => {
    const mockResponse = new Response("ok", { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    await fetchWithProxy("https://api.test.com/data", true);
    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1]).toBeDefined();
    expect(callArgs[1].signal).toBeInstanceOf(AbortSignal);
  });

  it("merges caller signal with timeout signal in direct mode", async () => {
    const mockResponse = new Response("ok", { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const controller = new AbortController();
    await fetchWithProxy("https://api.test.com/data", false, {
      signal: controller.signal,
    });
    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const signal = callArgs[1].signal as AbortSignal;
    expect(signal).toBeInstanceOf(AbortSignal);
    // The merged signal should not be the same reference as the caller's
    // signal (it wraps both caller + timeout via AbortSignal.any)
    expect(signal).not.toBe(controller.signal);
  });

  it("preserves caller headers when merging timeout signal", async () => {
    const mockResponse = new Response("ok", { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    await fetchWithProxy("https://api.test.com/data", false, {
      headers: { Authorization: "Basic abc123" },
    });
    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1].headers).toEqual({ Authorization: "Basic abc123" });
    expect(callArgs[1].signal).toBeInstanceOf(AbortSignal);
  });
});
