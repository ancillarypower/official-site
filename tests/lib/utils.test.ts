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

  it("preserves out-of-range decimal entities (regression #605)", () => {
    expect(decodeHtml("&#9999999;")).toBe("&#9999999;");
    expect(decodeHtml("&#1114112;")).toBe("&#1114112;");
  });

  it("preserves out-of-range hex entities (regression #605)", () => {
    expect(decodeHtml("&#x110000;")).toBe("&#x110000;");
    expect(decodeHtml("&#xFFFFFF;")).toBe("&#xFFFFFF;");
  });

  it("preserves numeric entities that overflow to infinity (regression #605)", () => {
    const decimal = `&#${"9".repeat(400)};`;
    const hex = `&#x${"F".repeat(400)};`;
    expect(decodeHtml(decimal)).toBe(decimal);
    expect(decodeHtml(hex)).toBe(hex);
  });

  it("decodes both inclusive numeric boundaries (regression #605)", () => {
    expect(decodeHtml("&#0;")).toBe(String.fromCharCode(0));
    expect(decodeHtml("&#x0;")).toBe(String.fromCharCode(0));
    expect(decodeHtml("&#1114111;")).toBe("\u{10FFFF}");
    expect(decodeHtml("&#x10FFFF;")).toBe("\u{10FFFF}");
  });

  it("decodes valid entities around invalid ones (regression #605)", () => {
    expect(decodeHtml("A &#9999999; &amp; &#169; &#x110000; &#x1F600;"))
      .toBe("A &#9999999; & \u00A9 &#x110000; \u{1F600}");
  });

  it("decodes only one entity layer (regression #605)", () => {
    expect(decodeHtml("&amp;lt;")).toBe("&lt;");
    expect(decodeHtml("&amp;#9999999;")).toBe("&#9999999;");
    expect(decodeHtml("&amp;#x110000;")).toBe("&#x110000;");
  });

  it("retains existing leading-zero and surrogate behavior (regression #605)", () => {
    expect(decodeHtml("&#00065; &#x000041;")).toBe("A A");
    expect(decodeHtml("&#55296; &#xD800;")).toBe("\uD800 \uD800");
  });

  it("preserves unrecognized numeric syntax (regression #605)", () => {
    expect(decodeHtml("&#-1; &#1.5; &#xZZ; &#X41; &#65"))
      .toBe("&#-1; &#1.5; &#xZZ; &#X41; &#65");
  });
});
