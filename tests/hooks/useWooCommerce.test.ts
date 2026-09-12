import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSettingsStore } from "@/stores/settingsStore";

// Verify the hook module can be imported
import { useWooProducts, useCheckout } from "@/hooks/useWooCommerce";

describe("useWooCommerce module", () => {
  it("exports useWooProducts function", () => {
    expect(typeof useWooProducts).toBe("function");
  });

  it("exports useCheckout function", () => {
    expect(typeof useCheckout).toBe("function");
  });
});
