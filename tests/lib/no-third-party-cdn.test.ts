import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative, resolve } from "path";

/**
 * Regression #586: Draco and web-ifc decoders used to be fetched at runtime
 * from a public CDN with no integrity check. Runtime code must now be served
 * from our own origin, so no source file may point at a public CDN host.
 */
const root = resolve(__dirname, "../..");
const CDN_HOSTS = /\b(?:cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com|esm\.sh)\b/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

describe("no runtime code from public CDNs (regression #586)", () => {
  it("src/ and index.html do not reference a public CDN host", () => {
    const files = [
      ...walk(resolve(root, "src")).filter((f) => /\.(ts|tsx|css|html)$/.test(f)),
      resolve(root, "index.html"),
    ];
    const offenders = files
      .filter((f) => CDN_HOSTS.test(readFileSync(f, "utf-8")))
      .map((f) => relative(root, f));
    expect(offenders).toEqual([]);
  });
});
