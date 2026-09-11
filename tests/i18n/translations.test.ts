import { describe, it, expect } from "vitest";
import { zh } from "@/i18n/zh";
import { en } from "@/i18n/en";

describe("i18n translation sync", () => {
  const zhKeys = Object.keys(zh).sort();
  const enKeys = Object.keys(en).sort();

  it("zh and en have the same number of keys", () => {
    expect(zhKeys).toHaveLength(enKeys.length);
  });

  it("zh and en have identical key sets", () => {
    const missingInEn = zhKeys.filter((k) => !enKeys.includes(k));
    const missingInZh = enKeys.filter((k) => !zhKeys.includes(k));
    expect(missingInEn).toEqual([]);
    expect(missingInZh).toEqual([]);
  });

  it("no empty values in zh", () => {
    for (const [key, value] of Object.entries(zh)) {
      expect(value, `zh.${key} should not be empty`).toBeTruthy();
    }
  });

  it("no empty values in en", () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value, `en.${key} should not be empty`).toBeTruthy();
    }
  });

  it("replacement tokens are consistent between zh and en", () => {
    const tokenPattern = /\{\w+\}/g;
    for (const key of zhKeys) {
      const zhTokens = (zh[key as keyof typeof zh].match(tokenPattern) ?? []).sort();
      const enTokens = (en[key as keyof typeof en]?.match(tokenPattern) ?? []).sort();
      expect(enTokens, `tokens mismatch for key "${key}"`).toEqual(zhTokens);
    }
  });
});
