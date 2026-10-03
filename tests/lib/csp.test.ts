import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  buildConnectSrc,
  injectConnectSrc,
  parseExtraOrigins,
  CSP_CONNECT_SRC_PLACEHOLDER,
  DEFAULT_WP_URL,
  type CspEnv,
} from "@/lib/csp";
import { CORS_PROXIES, DRACO_CDN, IFC_WASM_CDN } from "@/lib/constants";

const root = resolve(__dirname, "../..");
const read = (file: string) => readFileSync(resolve(root, file), "utf-8");

function renderedConnectSrc(env: CspEnv = {}): string[] {
  const html = injectConnectSrc(read("index.html"), buildConnectSrc(env));
  const csp = html.match(
    /<meta[^>]+http-equiv="Content-Security-Policy"[^>]+content="([^"]+)"/i,
  )?.[1];
  const directive = csp
    ?.split(";")
    .map((part) => part.trim().split(/\s+/))
    .find((tokens) => tokens[0] === "connect-src");
  return directive?.slice(1) ?? [];
}

describe("CSP connect-src allowlist (regression #583)", () => {
  it("rendered index.html connect-src has no scheme-wide or wildcard source", () => {
    const sources = renderedConnectSrc();
    expect(sources.length).toBeGreaterThan(0);
    expect(sources).not.toContain("https:");
    expect(sources).not.toContain("*");
    expect(sources.some((s) => s.includes("*"))).toBe(false);
  });

  it("covers every origin the app fetches by default (drift guard)", () => {
    const sources = renderedConnectSrc();
    expect(sources).toContain("'self'");
    expect(sources).toContain(DEFAULT_WP_URL);
    for (const proxy of CORS_PROXIES) {
      expect(sources).toContain(new URL(proxy).origin);
    }
    expect(sources).toContain(DRACO_CDN);
    expect(sources).toContain(IFC_WASM_CDN);
  });

  it("DEFAULT_WP_URL matches the settingsStore fallback", () => {
    expect(read("src/stores/settingsStore.ts")).toContain(`"${DEFAULT_WP_URL}"`);
  });

  it("uses the VITE_WP_URL origin, upgrading http:// like ensureHttps", () => {
    expect(buildConnectSrc({ VITE_WP_URL: "https://cms.example.com/blog/" })).toContain(
      "https://cms.example.com",
    );
    expect(buildConnectSrc({ VITE_WP_URL: "http://cms.example.com" })).toContain(
      "https://cms.example.com",
    );
    expect(buildConnectSrc({ VITE_WP_URL: "" })).toContain(DEFAULT_WP_URL);
  });

  it("deduplicates sources", () => {
    const list = buildConnectSrc({ VITE_CSP_CONNECT_EXTRA: "https://corsproxy.io" }).split(" ");
    expect(list.filter((s) => s === "https://corsproxy.io")).toHaveLength(1);
  });

  it("appends valid VITE_CSP_CONNECT_EXTRA origins", () => {
    const sources = renderedConnectSrc({
      VITE_CSP_CONNECT_EXTRA: "  https://staging.example.com https://shop.example.com/ ",
    });
    expect(sources).toContain("https://staging.example.com");
    expect(sources).toContain("https://shop.example.com");
  });

  it.each([
    ["http origin", "http://staging.example.com"],
    ["wildcard", "https://*.example.com"],
    ["path", "https://example.com/wp-json"],
    ["query", "https://example.com?x=1"],
    ["not a URL", "staging.example.com"],
  ])("rejects VITE_CSP_CONNECT_EXTRA with %s", (_label, value) => {
    expect(() => parseExtraOrigins(value)).toThrow(/\[csp\]/);
  });

  it("returns no extras when VITE_CSP_CONNECT_EXTRA is unset or blank", () => {
    expect(parseExtraOrigins(undefined)).toEqual([]);
    expect(parseExtraOrigins("   ")).toEqual([]);
  });

  it("fails loudly when the placeholder is missing from index.html", () => {
    expect(() => injectConnectSrc("<html></html>", "'self'")).toThrow(
      CSP_CONNECT_SRC_PLACEHOLDER,
    );
  });

  it.each(["README.md", "README.zh-TW.md"])(
    "%s documents every default allowlist source and VITE_CSP_CONNECT_EXTRA",
    (file) => {
      const doc = read(file);
      for (const source of buildConnectSrc().split(" ")) {
        expect(doc, `${file} is missing ${source}`).toContain(`\`${source}\``);
      }
      expect(doc).toContain("VITE_CSP_CONNECT_EXTRA");
    },
  );
});
