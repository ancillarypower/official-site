import { CORS_PROXIES } from "./constants";

let proxyIndex = 0;

/**
 * Fetch with optional CORS proxy rotation.
 * Tries each proxy in turn until one succeeds.
 */
export async function fetchWithProxy(
  url: string,
  useProxy: boolean,
): Promise<Response> {
  if (!useProxy) {
    return fetch(url);
  }

  for (let i = 0; i < CORS_PROXIES.length; i++) {
    const idx = (proxyIndex + i) % CORS_PROXIES.length;
    const proxy = CORS_PROXIES[idx];
    try {
      const response = await fetch(proxy + encodeURIComponent(url));
      if (response.ok || response.status === 404) {
        proxyIndex = idx;
        return response;
      }
    } catch {
      // Try next proxy
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
 * Build a WooCommerce REST API URL with auth params.
 */
export function wooApiUrl(
  baseUrl: string,
  endpoint: string,
  key: string,
  secret: string,
  params: Record<string, string> = {},
): string {
  const base = baseUrl.trim().replace(/\/+$/, "");
  const url = new URL(`${base}/wp-json/wc/v3/${endpoint}`);
  url.searchParams.set("consumer_key", key);
  url.searchParams.set("consumer_secret", secret);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return url.toString();
}
