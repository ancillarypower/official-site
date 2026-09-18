import { describe, it, expect } from "vitest";
import { decodeHtml } from "@/lib/utils";

describe("decodeHtml", () => {
  it("decodes named HTML entities", () => {
    expect(decodeHtml("headphones &amp; accessories")).toBe("headphones & accessories");
    expect(decodeHtml("5 &lt; 10 &gt; 3")).toBe("5 < 10 > 3");
    expect(decodeHtml("&quot;quoted&quot;")).toBe('"quoted"');
  });

  it("decodes numeric HTML entities", () => {
    expect(decodeHtml("it&#8217;s fine")).toBe("it\u2019s fine");
    expect(decodeHtml("&#169; 2026")).toBe("\u00A9 2026");
  });

  it("passes through plain text unchanged", () => {
    expect(decodeHtml("hello world")).toBe("hello world");
    expect(decodeHtml("price: $29.99")).toBe("price: $29.99");
  });

  it("returns empty string for empty input", () => {
    expect(decodeHtml("")).toBe("");
  });

  it("handles hex numeric entities (regression #125)", () => {
    expect(decodeHtml("&#x00A9;")).toBe("\u00A9");
    expect(decodeHtml("&#x2019;")).toBe("\u2019");
    expect(decodeHtml("emoji &#x1F4A9; here")).toBe("emoji \uD83D\uDCA9 here");
  });

  it("works without document (SSR-safe, regression #125)", () => {
    const originalDocument = globalThis.document;
    try {
      // @ts-expect-error — intentionally removing document to simulate SSR
      delete globalThis.document;
      expect(decodeHtml("&amp; &lt; &#8217;")).toBe("& < \u2019");
    } finally {
      globalThis.document = originalDocument;
    }
  });

  it("preserves unknown named entities as-is", () => {
    expect(decodeHtml("&unknownentity;")).toBe("&unknownentity;");
  });

  it("decodes additional common entities", () => {
    expect(decodeHtml("&hellip;")).toBe("\u2026");
    expect(decodeHtml("&lsquo;word&rsquo;")).toBe("\u2018word\u2019");
    expect(decodeHtml("&ldquo;word&rdquo;")).toBe("\u201Cword\u201D");
    expect(decodeHtml("&nbsp;")).toBe("\u00A0");
  });
});
