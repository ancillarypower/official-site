import { describe, it, expect } from "vitest";
import { AppError } from "@/lib/errors";

describe("AppError", () => {
  it("extends Error", () => {
    const err = new AppError("error_test", "Test fallback");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it("stores code, message (fallback), and name", () => {
    const err = new AppError("error_woo_not_configured", "WooCommerce is not configured");
    expect(err.code).toBe("error_woo_not_configured");
    expect(err.message).toBe("WooCommerce is not configured");
    expect(err.name).toBe("AppError");
  });

  it("stores optional params for interpolation", () => {
    const err = new AppError("error_price_changed", "Price changed", {
      details: "Widget: 10 \u2192 15",
    });
    expect(err.params).toEqual({ details: "Widget: 10 \u2192 15" });
  });

  it("defaults params to undefined when not provided", () => {
    const err = new AppError("error_test", "Test");
    expect(err.params).toBeUndefined();
  });

  it("is caught by catch (err instanceof Error)", () => {
    try {
      throw new AppError("error_test", "Test");
    } catch (err) {
      expect(err instanceof Error).toBe(true);
      expect(err instanceof AppError).toBe(true);
    }
  });
});
