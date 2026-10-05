import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/context/I18nContext";
import { ProductCard } from "@/components/store/ProductCard";
import { useCartStore, MAX_CART_QTY } from "@/stores/cartStore";
import type { DisplayProduct } from "@/lib/types";

const { mockToastWarning } = vi.hoisted(() => ({
  mockToastWarning: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { warning: mockToastWarning, error: vi.fn(), success: vi.fn() },
}));

function withProviders(ui: React.ReactElement) {
  return <MemoryRouter><I18nProvider>{ui}</I18nProvider></MemoryRouter>;
}

const product: DisplayProduct = {
  id: 1,
  name: "Test Headphones",
  desc: "Great sound",
  price: 10,
  img: null,
  icon: null,
  stockStatus: "instock",
};

function setCartQty(qty: number) {
  useCartStore.setState({
    items: [{ id: 1, name: "Test Headphones", price: 10, icon: null, img: null, qty }],
  });
}

function setPickerQty(qty: number) {
  fireEvent.change(screen.getByLabelText("數量"), { target: { value: String(qty) } });
}

const ADD = "加入購物車";

describe("ProductCard qty cap toast (regression #593)", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
    vi.clearAllMocks();
  });

  it("does not toast when the add stays within the cap", () => {
    setCartQty(MAX_CART_QTY - 2);
    render(withProviders(<ProductCard product={product} />));
    setPickerQty(2);
    fireEvent.click(screen.getByText(ADD));
    expect(useCartStore.getState().items[0]?.qty).toBe(MAX_CART_QTY);
    expect(mockToastWarning).not.toHaveBeenCalled();
  });

  it("toasts and clamps when the add would exceed the cap", () => {
    setCartQty(50);
    render(withProviders(<ProductCard product={product} />));
    setPickerQty(60);
    fireEvent.click(screen.getByText(ADD));
    expect(useCartStore.getState().items[0]?.qty).toBe(MAX_CART_QTY);
    expect(mockToastWarning).toHaveBeenCalledTimes(1);
    const msg = mockToastWarning.mock.calls[0]?.[0] as string;
    expect(msg).toContain("Test Headphones");
    expect(msg).toContain(String(MAX_CART_QTY));
  });

  it("toasts without showing 'added' when the item is already at the cap", () => {
    setCartQty(MAX_CART_QTY);
    render(withProviders(<ProductCard product={product} />));
    fireEvent.click(screen.getByText(ADD));
    expect(useCartStore.getState().items[0]?.qty).toBe(MAX_CART_QTY);
    expect(mockToastWarning).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/已加入/)).not.toBeInTheDocument();
  });
});
