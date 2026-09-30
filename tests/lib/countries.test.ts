import { describe, it, expect } from "vitest";
import { isValidCountryCode, VALID_COUNTRY_CODES } from "@/lib/countries";

describe("countries", () => {
  describe("VALID_COUNTRY_CODES", () => {
    it("contains at least 249 ISO 3166-1 alpha-2 codes", () => {
      expect(VALID_COUNTRY_CODES.size).toBeGreaterThanOrEqual(249);
    });

    it("is a ReadonlySet of strings", () => {
      expect(VALID_COUNTRY_CODES).toBeInstanceOf(Set);
    });

    it("contains common country codes", () => {
      for (const code of ["TW", "US", "JP", "GB", "DE", "FR", "CN", "KR"]) {
        expect(VALID_COUNTRY_CODES.has(code)).toBe(true);
      }
    });

    it("does not contain invalid codes", () => {
      expect(VALID_COUNTRY_CODES.has("XX")).toBe(false);
      expect(VALID_COUNTRY_CODES.has("ZZ")).toBe(false);
      expect(VALID_COUNTRY_CODES.has("")).toBe(false);
    });

    it("all entries are exactly 2 uppercase letters", () => {
      for (const code of VALID_COUNTRY_CODES) {
        expect(code).toMatch(/^[A-Z]{2}$/);
      }
    });
  });

  describe("isValidCountryCode", () => {
    it("returns true for valid uppercase code", () => {
      expect(isValidCountryCode("TW")).toBe(true);
      expect(isValidCountryCode("US")).toBe(true);
    });

    it("returns true for lowercase code (toUpperCase branch)", () => {
      expect(isValidCountryCode("tw")).toBe(true);
      expect(isValidCountryCode("us")).toBe(true);
    });

    it("returns true for mixed-case code", () => {
      expect(isValidCountryCode("Tw")).toBe(true);
      expect(isValidCountryCode("jP")).toBe(true);
    });

    it("returns false for invalid 2-char code", () => {
      expect(isValidCountryCode("XX")).toBe(false);
      expect(isValidCountryCode("ZZ")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isValidCountryCode("")).toBe(false);
    });

    it("returns false for single character", () => {
      expect(isValidCountryCode("T")).toBe(false);
    });

    it("returns false for three characters", () => {
      expect(isValidCountryCode("TWN")).toBe(false);
    });
  });
});
