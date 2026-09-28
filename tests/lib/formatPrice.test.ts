import { describe, it, expect } from "vitest";
import { formatPrice } from "@/lib/formatPrice";

describe("formatPrice", () => {
  it("formats TWD with zh-TW locale", () => {
    const result = formatPrice(1299, "zh");
    expect(result).toContain("NT$");
    expect(result).toContain("1,299");
  });

  it("formats TWD with en-US locale", () => {
    const result = formatPrice(1299, "en");
    expect(result).toContain("NT$");
    expect(result).toContain("1,299");
  });

  it("returns consistent formatting for same inputs (cache hit)", () => {
    const first = formatPrice(49.99, "zh");
    const second = formatPrice(49.99, "zh");
    expect(first).toBe(second);
  });

  it("JPY formats without decimal places (regression #546)", () => {
    const result = formatPrice(1000, "zh", "JPY");
    expect(result).toContain("\u00A5");
    expect(result).toContain("1,000");
    expect(result).not.toContain(".00");
  });

  it("same locale different currency uses distinct formatter (regression #546)", () => {
    const twd = formatPrice(1000, "zh", "TWD");
    const jpy = formatPrice(1000, "zh", "JPY");
    expect(twd).toContain(".00");
    expect(jpy).not.toContain(".00");
  });
});
