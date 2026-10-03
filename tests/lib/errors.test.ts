import { describe, it, expect } from "vitest";
import { AppError, OrderCreatedError } from "@/lib/errors";

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

describe("OrderCreatedError (regression #582)", () => {
  it("is an AppError so existing i18n handling keeps working", () => {
    const err = new OrderCreatedError("error_order_response_invalid", "Invalid order response", { id: "1" });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(OrderCreatedError);
    expect(err.code).toBe("error_order_response_invalid");
    expect(err.message).toBe("Invalid order response");
    expect(err.params).toEqual({ id: "1" });
    expect(err.name).toBe("OrderCreatedError");
  });

  it("a plain AppError with the same code is not an OrderCreatedError", () => {
    const err = new AppError("error_order_response_invalid", "Invalid order response");
    expect(err).not.toBeInstanceOf(OrderCreatedError);
  });
});
