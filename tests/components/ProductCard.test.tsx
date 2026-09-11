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

const saleProduct: DisplayProduct = {
  id: 2,
  name: "Sale Item",
  desc: "On sale",
  price: 59.99,
  regularPrice: 79.99,
  salePrice: 59.99,
  img: "https://example.com/prod.jpg",
  icon: null,
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

  it("renders product name, description, and price", () => {
    render(withProviders(<ProductCard product={product} />));
    expect(screen.getByText("Test Headphones")).toBeInTheDocument();
    expect(screen.getByText("Great sound")).toBeInTheDocument();
    expect(screen.getByText("$99.99")).toBeInTheDocument();
  });

  it("renders icon when no image", () => {
    render(withProviders(<ProductCard product={product} />));
    expect(screen.getByText("\uD83C\uDFA7")).toBeInTheDocument();
  });

  it("renders product image when available", () => {
    render(withProviders(<ProductCard product={saleProduct} />));
    const img = screen.getByAltText("Sale Item");
    expect(img).toHaveAttribute("src", "https://example.com/prod.jpg");
  });

  it("shows sale price with strikethrough regular price", () => {
    render(withProviders(<ProductCard product={saleProduct} />));
    expect(screen.getByText("$59.99")).toBeInTheDocument();
    expect(screen.getByText("$79.99")).toBeInTheDocument();
  });

  it("disables add button when out of stock", () => {
    render(withProviders(<ProductCard product={outOfStockProduct} />));
    const addBtn = screen.getByText("\u52A0\u5165\u8CFC\u7269\u8ECA");
    expect(addBtn).toBeDisabled();
  });

  it("adds item to cart on click", () => {
    render(withProviders(<ProductCard product={product} />));
    fireEvent.click(screen.getByText("\u52A0\u5165\u8CFC\u7269\u8ECA"));
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]?.qty).toBe(1);
  });

  it("shows cart quantity badge after adding", () => {
    useCartStore.setState({ items: [{ id: 1, name: "Test", price: 99.99, icon: null, img: null, qty: 2 }] });
    render(withProviders(<ProductCard product={product} />));
    expect(screen.getByText(/2/)).toBeInTheDocument();
    expect(screen.getByText("\u5728\u8CFC\u7269\u8ECA")).toBeInTheDocument();
  });

  it("adjusts quantity with +/- buttons", () => {
    render(withProviders(<ProductCard product={product} />));
    const incBtn = screen.getByLabelText("Increase quantity");
    fireEvent.click(incBtn);
    fireEvent.click(incBtn);
    // quantity should now be 3
    fireEvent.click(screen.getByText("\u52A0\u5165\u8CFC\u7269\u8ECA"));
    expect(useCartStore.getState().items[0]?.qty).toBe(3);
  });
});
