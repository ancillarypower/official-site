import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/context/I18nContext";
import { ProductGrid } from "@/components/store/ProductGrid";
import { useCartStore } from "@/stores/cartStore";
import type { DisplayProduct } from "@/lib/types";

function withProviders(ui: React.ReactElement) {
  return <MemoryRouter><I18nProvider>{ui}</I18nProvider></MemoryRouter>;
}

const products: DisplayProduct[] = [
  { id: 1, name: "Product A", desc: "Desc A", price: 10, img: null, icon: "A", stockStatus: "instock" },
  { id: 2, name: "Product B", desc: "Desc B", price: 20, img: null, icon: "B", stockStatus: "instock" },
];

describe("ProductGrid", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  it("renders all products", () => {
    render(withProviders(<ProductGrid products={products} />));
    expect(screen.getByText("Product A")).toBeInTheDocument();
    expect(screen.getByText("Product B")).toBeInTheDocument();
  });

  it("renders empty grid when no products", () => {
    const { container } = render(withProviders(<ProductGrid products={[]} />));
    expect(container.querySelector(".grid")?.children).toHaveLength(0);
  });
});
