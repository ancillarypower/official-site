import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/context/I18nContext";
import { ProductCard } from "@/components/store/ProductCard";
import { useCartStore } from "@/stores/cartStore";
import type { DisplayProduct } from "@/lib/types";

function withProviders(ui: React.ReactElement) {
  return <MemoryRouter><I18nProvider>{ui}</I18nProvider></MemoryRouter>;
}

const product: DisplayProduct = {
  id: 1,
  name: "Test Headphones",
  desc: "Great sound",
  price: 99.99,
  img: null,
  icon: "\uD83C\uDFA7",
  stockStatus: "instock",
};

const outOfStockProduct: DisplayProduct = {
  id: 3,
  name: "Sold Out",
  desc: "Not available",
  price: 49.99,
  img: null,
  icon: null,
  stockStatus: "outofstock",
};

describe("ProductCard", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  it("renders product name and price", () => {
    render(withProviders(<ProductCard product={product} />));
    expect(screen.getByText("Test Headphones")).toBeInTheDocument();
    expect(screen.getByText("$99.99")).toBeInTheDocument();
  });

  it("disables add button when out of stock", () => {
    render(withProviders(<ProductCard product={outOfStockProduct} />));
    expect(screen.getByText("\u52A0\u5165\u8CFC\u7269\u8ECA")).toBeDisabled();
  });

  it("adds item to cart on click", () => {
    render(withProviders(<ProductCard product={product} />));
    fireEvent.click(screen.getByText("\u52A0\u5165\u8CFC\u7269\u8ECA"));
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]?.qty).toBe(1);
  });

  it("shows cart badge after adding", () => {
    useCartStore.setState({ items: [{ id: 1, name: "Test", price: 99.99, icon: null, img: null, qty: 2 }] });
    render(withProviders(<ProductCard product={product} />));
    expect(screen.getByText(/\u5728\u8CFC\u7269\u8ECA/)).toBeInTheDocument();
  });
});
