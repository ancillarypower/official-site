import { CORS_PROXIES, FETCH_TIMEOUT } from "./constants";

let proxyIndex = 0;

/**
 * Build a composite AbortSignal that fires when either the caller's
 * signal aborts or the timeout expires, whichever comes first.
 *
 * Uses a manual AbortController instead of `AbortSignal.any()` for
 * broader runtime compatibility (Node.js 20 jsdom lacks it).
 *
 * If the caller did not supply a signal, a plain timeout signal is used.
 */
function buildSignal(init?: RequestInit): AbortSignal {
  const callerSignal = init?.signal;
  if (!callerSignal) return AbortSignal.timeout(FETCH_TIMEOUT);

  // Merge caller signal + timeout into one AbortController
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("The operation was aborted due to timeout", "TimeoutError")), FETCH_TIMEOUT);

  // Forward caller abort
  if (callerSignal.aborted) {
    clearTimeout(timer);
    controller.abort(callerSignal.reason);
  } else {
    callerSignal.addEventListener("abort", () => {
      clearTimeout(timer);
      controller.abort(callerSignal.reason);
    }, { once: true });
  }

  // Clean up timer when controller aborts (from timeout)
  controller.signal.addEventListener("abort", () => clearTimeout(timer), { once: true });

  return controller.signal;
}

/**
 * Fetch with optional CORS proxy rotation.
 * Tries each proxy in turn until one succeeds.
 *
 * Every request (direct and proxied) is subject to a {@link FETCH_TIMEOUT}
 * timeout. In direct mode the caller's optional `init.signal` is merged
 * with the timeout signal. In proxy mode the timeout signal is attached
 * to each individual proxy attempt; a timeout is treated as a proxy
 * failure and triggers the next proxy in rotation.
 *
 * When `useProxy` is false, the optional `init` parameter is forwarded
 * to the native `fetch()` call (e.g. for custom headers or POST body).
 * Proxy mode does NOT forward `init` because public CORS proxies cannot
 * relay custom request headers to the origin server.
 *
 * **Security:** Throws if the URL contains WooCommerce credentials
 * (`consumer_key` / `consumer_secret`) and proxy mode is enabled,
 * preventing credential leakage to third-party CORS proxy services.
 */
export async function fetchWithProxy(
  url: string,
  useProxy: boolean,
  init?: RequestInit,
): Promise<Response> {
  if (!useProxy) {
    return fetch(url, { ...init, signal: buildSignal(init) });
  }

  // Defense-in-depth: never send WooCommerce credentials through
  // third-party CORS proxies. The caller should omit credentials
  // for proxy-mode requests; this guard catches mistakes.
  if (url.includes("consumer_key") || url.includes("consumer_secret")) {
    throw new Error(
      "WooCommerce credentials must not be sent through CORS proxy. " +
        "Use direct mode or a self-hosted backend proxy.",
    );
  }

  for (let i = 0; i < CORS_PROXIES.length; i++) {
    const idx = (proxyIndex + i) % CORS_PROXIES.length;
    const proxy = CORS_PROXIES[idx];
    if (!proxy) continue;
    try {
      const response = await fetch(proxy + encodeURIComponent(url), {
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      });
      if (response.ok || response.status === 404) {
        proxyIndex = idx;
        return response;
      }
    } catch {
      // Timeout or network error: try next proxy
    }
  }

  throw new Error("All CORS proxies failed");
}

/**
 * Build the WP REST API base URL from a site URL.
 */
export function wpApiUrl(siteUrl: string): string {
  const base = siteUrl.trim().replace(/\/+$/, "");
  return `${base.startsWith("http") ? base : "https://" + base}/wp-json/wp/v2`;
}

/**
 * Build a WooCommerce REST API URL.
 *
 * Credentials are **not** included in the URL. Use {@link wooAuthHeaders}
 * for direct-mode authentication. Proxy mode does not support
 * authenticated WooCommerce requests (see Issue #43).
 */
export function wooApiUrl(
  baseUrl: string,
  endpoint: string,
  params: Record<string, string> = {},
): string {
  const base = baseUrl.trim().replace(/\/+$/, "");
  const url = new URL(`${base}/wp-json/wc/v3/${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return url.toString();
}

/**
 * Return an HTTP Basic Authentication header for WooCommerce REST API.
 *
 * Use this for **direct** requests (no CORS proxy) so that credentials
 * never appear in the URL, browser history, Referrer headers, or logs.
 */
export function wooAuthHeaders(key: string, secret: string): HeadersInit {
  return {
    Authorization: `Basic ${btoa(`${key}:${secret}`)}`,
  };
}

/**
 * Return credential query parameters for WooCommerce REST API.
 *
 * @deprecated Proxy mode no longer sends credentials to avoid leaking
 * them to third-party CORS proxy services (see Issue #43). This function
 * is retained for backward compatibility but should not be used.
 */
export function wooAuthParams(
  key: string,
  secret: string,
): Record<string, string> {
  return {
    consumer_key: key,
    consumer_secret: secret,
  };
}
