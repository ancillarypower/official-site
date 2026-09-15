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
});
