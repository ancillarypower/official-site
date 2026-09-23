import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Parse a CSP string into a Map of directive-name → value-tokens.
 * E.g. "script-src 'self'; object-src 'none'" →
 *   Map { "script-src" => ["'self'"], "object-src" => ["'none'"] }
 */
function parseCSP(csp: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const part of csp.split(";")) {
    const tokens = part.trim().split(/\s+/);
    const directive = tokens[0];
    if (directive) {
      map.set(directive, tokens.slice(1));
    }
  }
  return map;
}

describe("Content Security Policy (regression #148)", () => {
  const html = readFileSync(resolve(__dirname, "../../index.html"), "utf-8");

  // Extract CSP content attribute from meta tag.
  // Use [^"]+ (not [^"']+) because the CSP value contains single quotes
  // like 'self' and 'none' — the previous regex stopped at the first '.
  const cspMatch = html.match(
    /<meta[^>]+http-equiv="Content-Security-Policy"[^>]+content="([^"]+)"/i,
  );

  it("index.html contains a CSP meta tag", () => {
    expect(cspMatch).not.toBeNull();
  });

  // Only run directive tests if CSP tag exists
  const csp = cspMatch ? parseCSP(cspMatch[1]) : new Map<string, string[]>();

  it("script-src allows 'self' and 'wasm-unsafe-eval' but blocks 'unsafe-inline'", () => {
    const scriptSrc = csp.get("script-src") ?? [];
    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).toContain("'wasm-unsafe-eval'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it("object-src is 'none'", () => {
    expect(csp.get("object-src")).toEqual(["'none'"]);
  });

  it("form-action is present", () => {
    expect(csp.has("form-action")).toBe(true);
  });

  it("upgrade-insecure-requests is present", () => {
    expect(csp.has("upgrade-insecure-requests")).toBe(true);
  });

  it("style-src includes Google Fonts origin", () => {
    const styleSrc = csp.get("style-src") ?? [];
    expect(styleSrc).toContain("https://fonts.googleapis.com");
  });

  it("font-src includes Google Fonts static origin", () => {
    const fontSrc = csp.get("font-src") ?? [];
    expect(fontSrc).toContain("https://fonts.gstatic.com");
  });

  it("worker-src allows blob: for DRACOLoader", () => {
    const workerSrc = csp.get("worker-src") ?? [];
    expect(workerSrc).toContain("blob:");
  });

  it("frame-src allows OpenStreetMap embed origin", () => {
    const frameSrc = csp.get("frame-src") ?? [];
    expect(frameSrc).toContain("'self'");
    expect(frameSrc).toContain("https://www.openstreetmap.org");
  });
});
