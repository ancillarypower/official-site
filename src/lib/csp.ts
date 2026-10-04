import { ensureHttps } from "./api";
import { CORS_PROXIES } from "./constants";

/**
 * Build-time Content Security Policy helpers (Issue #583).
 *
 * `connect-src` used to be `'self' https:`, which let fetch/XHR reach any
 * HTTPS host. In direct mode the WooCommerce Basic Auth header is sent to
 * the URL stored in settings, so a tampered URL could leak credentials.
 * The allowlist is now derived from the same constants the app already uses
 * and injected into index.html by a Vite plugin (see vite.config.ts).
 *
 * This module runs in Node (vite.config.ts) as well as in tests, so it must
 * not touch `import.meta.env` or any browser-only API.
 */

/** Default WordPress site, kept identical to settingsStore's fallback. */
export const DEFAULT_WP_URL = "https://www.ancillarypower.com";

/** Placeholder in index.html replaced at dev/build time. */
export const CSP_CONNECT_SRC_PLACEHOLDER = "__CSP_CONNECT_SRC__";

export interface CspEnv {
  VITE_WP_URL?: string;
  /** Space-separated extra https:// origins (e.g. staging WordPress). */
  VITE_CSP_CONNECT_EXTRA?: string;
}

function toHttpsOrigin(url: string, label: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`[csp] ${label} is not a valid URL: "${url}"`);
  }
  if (parsed.protocol !== "https:") {
    throw new Error(`[csp] ${label} must use https://: "${url}"`);
  }
  return parsed.origin;
}

/**
 * Parse VITE_CSP_CONNECT_EXTRA. Each entry must be a bare https:// origin:
 * no wildcard, no path, no query. Invalid entries fail the build instead of
 * silently widening or breaking the policy.
 */
export function parseExtraOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((entry) => {
      if (entry.includes("*")) {
        throw new Error(`[csp] VITE_CSP_CONNECT_EXTRA must not contain wildcards: "${entry}"`);
      }
      const origin = toHttpsOrigin(entry, "VITE_CSP_CONNECT_EXTRA entry");
      if (entry.replace(/\/$/, "") !== origin) {
        throw new Error(
          `[csp] VITE_CSP_CONNECT_EXTRA entries must be origins without path or query: "${entry}"`,
        );
      }
      return origin;
    });
}

/** Build the `connect-src` source list (without the directive name). */
export function buildConnectSrc(env: CspEnv = {}): string {
  const wpUrl = ensureHttps(env.VITE_WP_URL ?? "") || DEFAULT_WP_URL;
  const sources = [
    // 'self' also covers the Draco / web-ifc decoders, which are self-hosted
    // since Issue #586 (see src/lib/decoderAssets.ts).
    "'self'",
    toHttpsOrigin(wpUrl, "VITE_WP_URL"),
    ...CORS_PROXIES.map((proxy) => toHttpsOrigin(proxy, "CORS_PROXIES entry")),
    ...parseExtraOrigins(env.VITE_CSP_CONNECT_EXTRA),
  ];
  return [...new Set(sources)].join(" ");
}

/** Replace the placeholder in index.html; throws if it is missing. */
export function injectConnectSrc(html: string, connectSrc: string): string {
  if (!html.includes(CSP_CONNECT_SRC_PLACEHOLDER)) {
    throw new Error(
      `[csp] ${CSP_CONNECT_SRC_PLACEHOLDER} not found in index.html; connect-src would not be enforced`,
    );
  }
  return html.split(CSP_CONNECT_SRC_PLACEHOLDER).join(connectSrc);
}
