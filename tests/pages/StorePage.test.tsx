import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/context/I18nContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCartStore } from "@/stores/cartStore";

const { mockUseWooProducts } = vi.hoisted(() => ({
  mockUseWooProducts: vi.fn(),
}));

vi.mock("@/hooks/useWooCommerce", () => ({
  useWooProducts: (...args: unknown[]) => mockUseWooProducts(...args),
  useCheckout: () => ({ mutateAsync: vi.fn() }),
}));

import StorePage from "@/pages/StorePage";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <I18nProvider>
          <StorePage />
        </I18nProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("StorePage", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
    mockUseWooProducts.mockReturnValue({ data: undefined });
  });

  it("renders store title", () => {
    renderPage();
    expect(screen.getByText("\u5546\u5E97")).toBeInTheDocument();
  });

  it("shows sample products", () => {
    renderPage();
    expect(screen.getByText("\u7121\u7DDA\u964D\u566A\u8033\u6A5F")).toBeInTheDocument();
  });

  it("shows product count", () => {
    renderPage();
    expect(screen.getByText("8 \u9805\u5546\u54C1")).toBeInTheDocument();
  });

  it("filters products by name", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("Filter"), { target: { value: "xyz_no_match" } });
    expect(screen.queryByText("\u7121\u7DDA\u964D\u566A\u8033\u6A5F")).not.toBeInTheDocument();
  });

  it("sorts by price ascending", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "price_asc" } });
    expect(screen.getByText("\u7121\u7DDA\u964D\u566A\u8033\u6A5F")).toBeInTheDocument();
  });

  it("sorts by price descending", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "price_desc" } });
    expect(screen.getByText("\u7121\u7DDA\u964D\u566A\u8033\u6A5F")).toBeInTheDocument();
  });

  it("sorts by title ascending", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "title_asc" } });
    expect(screen.getByText("\u7121\u7DDA\u964D\u566A\u8033\u6A5F")).toBeInTheDocument();
  });

  it("sorts by title descending", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "title_desc" } });
    expect(screen.getByText("\u7121\u7DDA\u964D\u566A\u8033\u6A5F")).toBeInTheDocument();
  });

  it("renders WooCommerce products with badge", () => {
    mockUseWooProducts.mockReturnValue({
      data: {
        products: [{
          id: 1, name: "WC Product", short_description: "<p>desc</p>",
          price: "29.99", regular_price: "29.99", sale_price: "",
          images: [{ src: "https://example.com/img.jpg" }], stock_status: "instock",
        }],
        totalProducts: 1, totalPages: 1,
      },
    });
    renderPage();
    expect(screen.getByText("WC Product")).toBeInTheDocument();
    expect(screen.getByText(/WooCommerce/)).toBeInTheDocument();
  });

  it("renders pagination with WooCommerce data", () => {
    mockUseWooProducts.mockReturnValue({
      data: {
        products: [{
          id: 1, name: "P", short_description: "", price: "10",
          regular_price: "10", sale_price: "", images: [], stock_status: "instock",
        }],
        totalProducts: 30, totalPages: 3,
      },
    });
    renderPage();
    expect(screen.getByText("1/3")).toBeInTheDocument();
  });
});
