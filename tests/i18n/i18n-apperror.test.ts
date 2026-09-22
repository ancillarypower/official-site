import { describe, it, expect } from "vitest";
import { zh } from "@/i18n/zh";
import { en } from "@/i18n/en";

/**
 * Every AppError code used in the codebase must have a corresponding
 * translation key in both zh.ts and en.ts. When a key is missing, the
 * i18n fallback returns the raw error code string (e.g.
 * "error_proxy_all_failed") to the user instead of a localised message.
 *
 * Regression test for Issue #452.
 */
describe("AppError i18n keys (regression #452)", () => {
  const APPERROR_CODES = [
    "error_proxy_bad_response",
    "error_proxy_credential_blocked",
    "error_proxy_all_failed",
    "error_woo_url_missing",
    "error_woo_url_invalid",
    "error_api_unexpected_format",
    "error_price_validation_failed",
    "error_woo_not_configured",
    "error_checkout_proxy_unavailable",
    "error_price_changed",
    "error_items_out_of_stock",
    "error_order_response_invalid",
  ] as const;

  it("all AppError codes have corresponding zh translation keys", () => {
    for (const code of APPERROR_CODES) {
      expect(zh).toHaveProperty(code);
      expect((zh as Record<string, string>)[code]).toBeTruthy();
    }
  });

  it("all AppError codes have corresponding en translation keys", () => {
    for (const code of APPERROR_CODES) {
      expect(en).toHaveProperty(code);
      expect((en as Record<string, string>)[code]).toBeTruthy();
    }
  });
});
