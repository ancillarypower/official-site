import { describe, it, expect } from "vitest";
import { zh } from "@/i18n/zh";
import { en } from "@/i18n/en";

describe("i18n translation completeness", () => {
  const zhKeys = Object.keys(zh).sort();
  const enKeys = Object.keys(en).sort();

  it("zh and en have identical keys", () => {
    expect(zhKeys).toEqual(enKeys);
  });

  it("no empty string values in zh", () => {
    for (const [key, value] of Object.entries(zh)) {
      expect(value, `zh.${key} should not be empty`).not.toBe("");
    }
  });

  it("no empty string values in en", () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value, `en.${key} should not be empty`).not.toBe("");
    }
  });

  it("placeholder patterns are consistent between languages", () => {
    const placeholderPattern = /\{(\w+)\}/g;
    for (const key of zhKeys) {
      const zhMatches = [...(zh as Record<string, string>)[key]!.matchAll(placeholderPattern)].map(
        (m) => m[1],
      );
      const enMatches = [...(en as Record<string, string>)[key]!.matchAll(placeholderPattern)].map(
        (m) => m[1],
      );
      expect(
        zhMatches.sort(),
        `Placeholders mismatch for key "${key}"`,
      ).toEqual(enMatches.sort());
    }
  });
});
