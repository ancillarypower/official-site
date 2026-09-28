import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductCard } from "@/components/store/ProductCard";
import type { DisplayProduct } from "@/lib/types";

// Mock i18n to return zh-TW translations for a11y keys
const mockTranslations: Record<string, string> = {
  a11y_decrease_qty: "減少數量",
  a11y_increase_qty: "增加數量",
  a11y_quantity: "數量",
  in_cart: "在購物車",
  added: "\u2713 已加入",
  add_to_cart: "加入購物車",
};

vi.mock("@/context/I18nContext", () => ({
  useI18n: () => ({
    t: (key: string) => mockTranslations[key] ?? key,
    lang: "zh" as const,
  }),
}));

vi.mock("@/stores/cartStore", () => ({
  useCartStore: () => ({
    addItem: vi.fn(),
    getQty: () => 0,
  }),
}));

vi.mock("@/lib/formatPrice", () => ({
  formatPrice: (price: number) => `$${price}`,
}));

const mockProduct: DisplayProduct = {
  id: 1,
  name: "Test Product",
  price: 100,
  desc: "A test product",
  icon: "\uD83D\uDCE6",
  img: "",
  stockStatus: "instock",
  regularPrice: null,
  salePrice: null,
};

describe("ProductCard a11y aria-labels (regression #530)", () => {
  it("quantity controls use i18n aria-labels instead of hardcoded English", () => {
    render(<ProductCard product={mockProduct} />);

    // Decrease button should use i18n key, not hardcoded "Decrease quantity"
    const decreaseBtn = screen.getByLabelText("減少數量");
    expect(decreaseBtn).toBeDefined();
    expect(screen.queryByLabelText("Decrease quantity")).toBeNull();

    // Quantity input should use i18n key, not hardcoded "Quantity"
    const qtyInput = screen.getByLabelText("數量");
    expect(qtyInput).toBeDefined();
    expect(screen.queryByLabelText("Quantity")).toBeNull();

    // Increase button should use i18n key, not hardcoded "Increase quantity"
    const increaseBtn = screen.getByLabelText("增加數量");
    expect(increaseBtn).toBeDefined();
    expect(screen.queryByLabelText("Increase quantity")).toBeNull();
  });
});
