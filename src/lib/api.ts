import { CORS_PROXIES, FETCH_TIMEOUT } from "./constants";
import { AppError } from "./errors";

let proxyIndex = 0;

/**
 * Ensure a URL uses HTTPS.
 *
 * Trims whitespace and trailing slashes, upgrades `http://` to
 * `https://`, and prepends `https://` when no protocol is present.
 * Returns an empty string unchanged (no protocol is added).
 *
 * This prevents WooCommerce credentials from being transmitted in
 * cleartext when a user enters an `http://` URL (Issue #111).
 */
export function ensureHttps(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("http://"))
    return trimmed.replace("http://", "https://");
  if (!trimmed.startsWith("https://")) return "https://" + trimmed;
  return trimmed;
}

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
 * Safely parse a JSON response body, guarding against non-JSON responses.
 *
 * CORS proxies (e.g. allorigins.win) sometimes return HTTP 200 with an
 * HTML error page when the upstream API fails. Calling `response.json()`
 * on such a response throws a meaningless `SyntaxError`. This helper
 * detects HTML responses and produces a diagnostic error message that
 * identifies the problem (Issue #221).
 *
 * Detection strategy:
 * - `text/html` Content-Type: fail fast with a body preview. This is the
 *   most common proxy error page format.
 * - Any other Content-Type (including `text/plain`, which is the default
 *   for `new Response(string)`, or missing headers from proxy stripping):
 *   attempt JSON parsing. If parsing fails with `SyntaxError`, wrap it in
 *   a descriptive error.
 */
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
export async function parseJsonResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  // HTML responses are a clear signal of a proxy error page
  if (contentType.includes("text/html")) {
    const preview = (await response.text()).slice(0, 200);
    throw new AppError(
      "error_proxy_bad_response",
      `Expected JSON response but received ${contentType}. ` +
      `This usually means the CORS proxy returned an error page. ` +
      `Preview: ${preview}`,
    );
  }

  // For JSON, text/plain, missing, or any other content-type: try parsing
  try {
    return await response.json();
  } catch (err) {
    // Only wrap SyntaxError (malformed JSON); rethrow everything else
    if (err instanceof SyntaxError) {
      throw new AppError(
        "error_proxy_bad_response",
        `Expected JSON response but received non-JSON body. ` +
        `This usually means the CORS proxy returned an error page. ` +
        `Parse error: ${err.message}`,
      );
    }
    throw err;
  }
}

/**
 * Fetch with optional CORS proxy rotation.
 * Tries each proxy in turn until one succeeds.
 *
 * Every request (direct and proxied) is subject to a {@link FETCH_TIMEOUT}
 * timeout. In direct mode the caller's optional `init.signal` is merged
 * with the timeout signal. In proxy mode the caller's signal is merged
 * with each per-attempt timeout; a caller abort immediately stops proxy
 * rotation (Issue #205).
 *
 * When `useProxy` is false, the optional `init` parameter is forwarded
 * to the native `fetch()` call (e.g. for custom headers or POST body).
 * Proxy mode does NOT forward `init` because public CORS proxies cannot
 * relay custom request headers to the origin server.
 *
 * **Error discrimination (Issue #271):** In proxy mode, if every proxy
 * attempt fails but at least one returned an HTTP response (e.g. 403,
 * 500), the last such response is returned to the caller instead of
 * throwing the generic "All CORS proxies failed" error. This lets
 * callers distinguish upstream API errors from proxy infrastructure
 * failures (network errors, timeouts).
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
    throw new AppError(
      "error_proxy_credential_blocked",
      "WooCommerce credentials must not be sent through CORS proxy. " +
        "Use direct mode or a self-hosted backend proxy.",
    );
  }

  const callerSignal = init?.signal;
  const errors: string[] = [];
  let lastUpstreamResponse: Response | null = null;

  for (let i = 0; i < CORS_PROXIES.length; i++) {
    // Stop rotation immediately if the caller cancelled (Issue #205)
    if (callerSignal?.aborted) {
      throw new DOMException("The operation was aborted.", "AbortError");
    }

    const idx = (proxyIndex + i) % CORS_PROXIES.length;
    const proxy = CORS_PROXIES[idx];
    if (!proxy) continue;
    try {
      const response = await fetch(proxy + encodeURIComponent(url), {
        signal: buildSignal(init),
      });
      if (response.ok) {
        proxyIndex = idx;
        return response;
      }
      // Non-ok HTTP response: track as upstream API error (Issue #271)
      lastUpstreamResponse = response;
      errors.push(`${proxy}: HTTP ${response.status}`);
    } catch (err) {
      // Caller abort: stop rotation immediately (Issue #205)
      if (callerSignal?.aborted) {
        throw new DOMException("The operation was aborted.", "AbortError");
      }
      errors.push(
        `${proxy}: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  }

  // If at least one proxy returned an HTTP response (even non-ok),
  // return it so callers can inspect the actual status code and body.
  // This distinguishes upstream API errors (403, 500) from proxy
  // infrastructure failures (network errors, timeouts). (Issue #271)
  if (lastUpstreamResponse) return lastUpstreamResponse;

  throw new AppError(
    "error_proxy_all_failed",
    `All CORS proxies failed:\n${errors.join("\n")}`,
  );
}

/**
 * Build the WP REST API base URL from a site URL.
 *
 * Forces HTTPS via {@link ensureHttps} to prevent credentials from
 * being transmitted in cleartext (Issue #111). Strips any existing
 * `/wp-json` path the user may have pasted (e.g. from the browser
 * address bar) before appending the canonical API prefix, preventing
 * path duplication (Issue #86).
 */
export function wpApiUrl(siteUrl: string): string {
  let base = ensureHttps(siteUrl);
  base = base.replace(/\/wp-json(\/.*)?$/, "");
  return `${base}/wp-json/wp/v2`;
}

/**
 * Build a WooCommerce REST API URL.
 *
 * Validates the input URL before constructing the API endpoint.
 * Throws a user-friendly error when the URL is empty or malformed,
 * guiding the user to the Settings panel (Issue #121).
 *
 * Strips any existing `/wp-json` path the user may have pasted
 * before appending the canonical API prefix (Issue #86).
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
  let base = baseUrl.trim().replace(/\/+$/, "");
  base = base.replace(/\/wp-json(\/.*)?$/, "");

  if (!base) {
    throw new AppError(
      "error_woo_url_missing",
      "WooCommerce store URL is not configured. Please check Settings.",
    );
  }

  let url: URL;
  try {
    url = new URL(`${base}/wp-json/wc/v3/${endpoint}`);
  } catch {
    throw new AppError(
      "error_woo_url_invalid",
      `Invalid WooCommerce URL: "${base}". Please check Settings.`,
      { url: base },
    );
  }

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
