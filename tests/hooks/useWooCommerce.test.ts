import { describe, it, expect } from "vitest";
import { useWooProducts, useCheckout } from "@/hooks/useWooCommerce";

describe("useWooCommerce module", () => {
  it("exports useWooProducts function", () => {
    expect(typeof useWooProducts).toBe("function");
  });

  it("exports useCheckout function", () => {
    expect(typeof useCheckout).toBe("function");
  });
});
