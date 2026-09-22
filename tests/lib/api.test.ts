import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchWithProxy, wpApiUrl, wooApiUrl, wooAuthHeaders, ensureHttps, parseJsonResponse } from "@/lib/api";

describe("ensureHttps", () => {
  it("returns empty string unchanged", () => {
    expect(ensureHttps("")).toBe("");
    expect(ensureHttps("   ")).toBe("");
  });

  it("upgrades http:// to https:// (regression #111)", () => {
    expect(ensureHttps("http://example.com")).toBe("https://example.com");
    expect(ensureHttps("http://localhost:8080")).toBe("https://localhost:8080");
  });

  it("preserves existing https://", () => {
    expect(ensureHttps("https://example.com")).toBe("https://example.com");
  });

  it("prepends https:// when no protocol is present", () => {
    expect(ensureHttps("example.com")).toBe("https://example.com");
  });

  it("trims whitespace and trailing slashes", () => {
    expect(ensureHttps("  http://example.com///  ")).toBe("https://example.com");
  });
});

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

  it("upgrades http:// to https:// (regression #111)", () => {
    expect(wpApiUrl("http://localhost:8080")).toBe(
      "https://localhost:8080/wp-json/wp/v2",
    );
  });

  it("handles whitespace around URL", () => {
    expect(wpApiUrl("  https://example.com  ")).toBe(
      "https://example.com/wp-json/wp/v2",
    );
  });

  // --- Regression tests for Issue #86: /wp-json path duplication ---

  it("strips existing /wp-json/wp/v2 path to prevent duplication (regression #86)", () => {
    expect(wpApiUrl("https://example.com/wp-json/wp/v2")).toBe(
      "https://example.com/wp-json/wp/v2",
    );
  });

  it("strips existing /wp-json path to prevent duplication (regression #86)", () => {
    expect(wpApiUrl("https://example.com/wp-json")).toBe(
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
      consumer_key: "ck_key",
      consumer_secret: "cs_secret",
      per_page: "10",
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("consumer_key")).toBe("ck_key");
    expect(parsed.searchParams.get("consumer_secret")).toBe("cs_secret");
    expect(parsed.searchParams.get("per_page")).toBe("10");
  });

  // --- Regression tests for Issue #86: /wp-json path duplication ---

  it("strips existing /wp-json/wc/v3 path to prevent duplication (regression #86)", () => {
    const url = wooApiUrl("https://shop.com/wp-json/wc/v3", "products");
    expect(new URL(url).pathname).toBe("/wp-json/wc/v3/products");
  });

  it("strips existing /wp-json path to prevent duplication (regression #86)", () => {
    const url = wooApiUrl("https://shop.com/wp-json", "products");
    expect(new URL(url).pathname).toBe("/wp-json/wc/v3/products");
  });

  // --- Regression tests for Issue #121: friendly error on invalid URL ---

  it("throws friendly error when baseUrl is empty (regression #121)", () => {
    expect(() => wooApiUrl("", "products")).toThrow(
      "WooCommerce store URL is not configured. Please check Settings.",
    );
  });

  it("throws friendly error when baseUrl is whitespace-only (regression #121)", () => {
    expect(() => wooApiUrl("   ", "products")).toThrow(
      "WooCommerce store URL is not configured. Please check Settings.",
    );
  });

  it("throws friendly error when baseUrl is malformed (regression #121)", () => {
    expect(() => wooApiUrl("not a url !!!", "products")).toThrow(
      /Invalid WooCommerce URL:.*Please check Settings/,
    );
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

describe("parseJsonResponse", () => {
  it("throws descriptive error when response content-type is text/html (regression #221)", async () => {
    const htmlBody = "<html><body><h1>502 Bad Gateway</h1><p>The proxy server received an invalid response.</p></body></html>";
    const response = new Response(htmlBody, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });

    await expect(parseJsonResponse(response)).rejects.toThrow(
      /Expected JSON response but received text\/html/,
    );
    // Should include a preview of the body
    try {
      const resp2 = new Response(htmlBody, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
      await parseJsonResponse(resp2);
    } catch (err) {
      expect((err as Error).message).toContain("502 Bad Gateway");
      expect((err as Error).message).toContain("CORS proxy returned an error page");
    }
  });

  it("returns parsed JSON when content-type includes application/json (regression #221)", async () => {
    const response = new Response(JSON.stringify({ id: 1, title: "Test" }), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });

    const result = await parseJsonResponse(response);
    expect(result).toEqual({ id: 1, title: "Test" });
  });

  it("attempts JSON parse when content-type header is missing (regression #221)", async () => {
    // CORS proxies may strip Content-Type; valid JSON should still parse
    const response = new Response(JSON.stringify([{ id: 1 }]), {
      status: 200,
    });

    const result = await parseJsonResponse(response);
    expect(result).toEqual([{ id: 1 }]);
  });

  it("wraps SyntaxError with diagnostic message when content-type is missing and body is not JSON (regression #221)", async () => {
    const response = new Response("<html>Error</html>", {
      status: 200,
    });

    await expect(parseJsonResponse(response)).rejects.toThrow(
      /Expected JSON response but received non-JSON body/,
    );
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

  it("throws when all proxies fail with diagnostic details", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    await expect(
      fetchWithProxy("https://api.test.com/data", true),
    ).rejects.toThrow(/All CORS proxies failed/);
  });

  it("returns upstream 404 response instead of throwing (regression #176 updated for #271)", async () => {
    const notFound = new Response("Not Found", { status: 404 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(notFound));

    const result = await fetchWithProxy("https://api.test.com/missing", true);
    // With #271 fix, upstream HTTP responses are returned, not thrown
    expect(result.status).toBe(404);
  });

  it("still rotates to next proxy on non-ok response before returning last upstream (regression #176 + #271)", async () => {
    const notFound = new Response("Not Found", { status: 404 });
    const okResponse = new Response("ok", { status: 200 });
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(notFound)
      .mockResolvedValueOnce(okResponse);
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchWithProxy("https://api.test.com/missing", true);
    // Second proxy returned ok, so we get the ok response
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
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

  // --- Regression tests for Issue #87: proxy error diagnostics ---

  it("includes per-proxy network error details when all proxies fail (regression #87)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    try {
      await fetchWithProxy("https://api.test.com/data", true);
      expect.unreachable("should have thrown");
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toMatch(/All CORS proxies failed/);
      expect(msg).toContain("corsproxy");
      expect(msg).toContain("allorigins");
      expect(msg).toContain("Network error");
    }
  });

  it("returns upstream server error response instead of throwing (regression #87 updated for #271)", async () => {
    const serverError = new Response("Error", { status: 500 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(serverError));

    // With #271 fix, upstream HTTP 500 is returned, not thrown
    const result = await fetchWithProxy("https://api.test.com/data", true);
    expect(result.status).toBe(500);
  });

  // --- Regression tests for Issue #205: AbortSignal in proxy mode ---

  it("re-throws AbortError from caller signal in proxy mode (regression #205)", async () => {
    vi.stubGlobal("fetch", vi.fn());

    const controller = new AbortController();
    controller.abort(); // Already aborted

    await expect(
      fetchWithProxy("https://api.test.com/data", true, {
        signal: controller.signal,
      }),
    ).rejects.toThrow("The operation was aborted.");
    // fetch should never have been called — abort checked before first attempt
    expect(fetch).not.toHaveBeenCalled();
  });

  it("propagates caller abort mid-rotation in proxy mode (regression #205)", async () => {
    const controller = new AbortController();
    const serverError = new Response("Error", { status: 500 });
    const mockFetch = vi.fn().mockImplementation(() => {
      // Abort after the first proxy attempt fails
      controller.abort();
      return Promise.resolve(serverError);
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      fetchWithProxy("https://api.test.com/data", true, {
        signal: controller.signal,
      }),
    ).rejects.toThrow("The operation was aborted.");
    // Only the first proxy was attempted; rotation stopped on abort
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("forwards caller signal to proxy fetch via buildSignal (regression #205)", async () => {
    const mockResponse = new Response("ok", { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const controller = new AbortController();
    await fetchWithProxy("https://api.test.com/data", true, {
      signal: controller.signal,
    });

    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1]).toHaveProperty("signal");
    expect(callArgs[1].signal).toBeInstanceOf(AbortSignal);
  });

  // --- Regression tests for Issue #271: upstream error discrimination ---

  it("returns upstream API error response instead of throwing when all proxies get HTTP error (regression #271)", async () => {
    const forbidden = new Response('{"code":"rest_forbidden","message":"Forbidden"}', {
      status: 403,
      headers: { "content-type": "application/json" },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(forbidden));

    const result = await fetchWithProxy("https://api.test.com/data", true);
    // Upstream 403 is returned, not thrown as "All CORS proxies failed"
    expect(result.status).toBe(403);
    const body = await result.json();
    expect(body.code).toBe("rest_forbidden");
  });

  it("still throws when all proxies have network errors only (regression #271)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    await expect(
      fetchWithProxy("https://api.test.com/data", true),
    ).rejects.toThrow(/All CORS proxies failed/);
  });

  it("returns upstream response even when some proxies have network errors (regression #271)", async () => {
    const serverError = new Response('{"code":"internal_error"}', {
      status: 500,
      headers: { "content-type": "application/json" },
    });
    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(serverError);
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchWithProxy("https://api.test.com/data", true);
    // First proxy had network error, second returned 500 — return the 500
    expect(result.status).toBe(500);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
