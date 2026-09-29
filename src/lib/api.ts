import { CORS_PROXIES, FETCH_TIMEOUT } from "./constants";
import { AppError } from "./errors";

let proxyIndex = 0;

export function ensureHttps(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("http://")) return trimmed.replace("http://", "https://");
  if (!trimmed.startsWith("https://")) return "https://" + trimmed;
  return trimmed;
}

interface SignalHandle { signal: AbortSignal; cleanup: () => void; }

function buildSignal(init?: RequestInit): SignalHandle {
  const callerSignal = init?.signal;
  if (!callerSignal) return { signal: AbortSignal.timeout(FETCH_TIMEOUT), cleanup: () => {} };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("The operation was aborted due to timeout", "TimeoutError")), FETCH_TIMEOUT);
  if (callerSignal.aborted) { clearTimeout(timer); controller.abort(callerSignal.reason); }
  else callerSignal.addEventListener("abort", () => { clearTimeout(timer); controller.abort(callerSignal.reason); }, { once: true });
  controller.signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
  return { signal: controller.signal, cleanup: () => clearTimeout(timer) };
}

export async function parseJsonResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    const preview = (await response.text()).slice(0, 200);
    throw new AppError("error_proxy_bad_response", `Expected JSON response but received ${contentType}. This usually means the CORS proxy returned an error page. Preview: ${preview}`);
  }
  try { return await response.json(); }
  catch (err) {
    if (err instanceof SyntaxError) throw new AppError("error_proxy_bad_response", `Expected JSON response but received non-JSON body. This usually means the CORS proxy returned an error page. Parse error: ${err.message}`);
    throw err;
  }
}

export async function fetchWithProxy(url: string, useProxy: boolean, init?: RequestInit): Promise<Response> {
  if (!useProxy) {
    const { signal, cleanup } = buildSignal(init);
    try { return await fetch(url, { ...init, signal }); } finally { cleanup(); }
  }
  if (url.includes("consumer_key") || url.includes("consumer_secret")) throw new AppError("error_proxy_credential_blocked", "WooCommerce credentials must not be sent through CORS proxy. Use direct mode or a self-hosted backend proxy.");
  const callerSignal = init?.signal;
  const errors: string[] = [];
  let lastUpstreamResponse: Response | null = null;
  for (let i = 0; i < CORS_PROXIES.length; i++) {
    if (callerSignal?.aborted) throw new DOMException("The operation was aborted.", "AbortError");
    const idx = (proxyIndex + i) % CORS_PROXIES.length;
    const proxy = CORS_PROXIES[idx];
    if (!proxy) continue;
    const { signal, cleanup } = buildSignal(init);
    try {
      const response = await fetch(proxy + encodeURIComponent(url), { signal });
      if (response.ok) { proxyIndex = idx; return response; }
      lastUpstreamResponse = response; errors.push(`${proxy}: HTTP ${response.status}`);
    } catch (err) {
      if (callerSignal?.aborted) throw new DOMException("The operation was aborted.", "AbortError");
      errors.push(`${proxy}: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally { cleanup(); }
  }
  if (lastUpstreamResponse) return lastUpstreamResponse;
  throw new AppError("error_proxy_all_failed", `All CORS proxies failed:\n${errors.join("\n")}`);
}

export function wpApiUrl(siteUrl: string): string {
  let base = ensureHttps(siteUrl);
  base = base.replace(/\/wp-json(\/.*)?$/, "");
  return `${base}/wp-json/wp/v2`;
}

/** Build a WordPress REST API URL with consistently encoded query parameters. */
export function wpBuildUrl(apiBase: string, endpoint: string, params: Record<string, string> = {}): string {
  const url = new URL(`${apiBase}/${endpoint}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

export function wooApiUrl(baseUrl: string, endpoint: string, params: Record<string, string> = {}): string {
  let base = baseUrl.trim().replace(/\/+$/, "");
  base = base.replace(/\/wp-json(\/.*)?$/, "");
  if (!base) throw new AppError("error_woo_url_missing", "WooCommerce store URL is not configured. Please check Settings.");
  let url: URL;
  try { url = new URL(`${base}/wp-json/wc/v3/${endpoint}`); }
  catch { throw new AppError("error_woo_url_invalid", `Invalid WooCommerce URL: "${base}". Please check Settings.`, { url: base }); }
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.toString();
}

export function wooAuthHeaders(key: string, secret: string): HeadersInit {
  return { Authorization: `Basic ${btoa(`${key}:${secret}`)}` };
}
