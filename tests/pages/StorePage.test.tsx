import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

  it("shows sample products when WooCommerce is not connected", () => {
    renderPage();
    expect(screen.getByText("\u7121\u7DDA\u964D\u566A\u8033\u6A5F")).toBeInTheDocument();
  });

  it("shows product count for samples", () => {
    renderPage();
    expect(screen.getByText("8 \u9805\u5546\u54C1")).toBeInTheDocument();
  });

  it("does not show WooCommerce badge for samples", () => {
    renderPage();
    expect(screen.queryByText("WooCommerce")).not.toBeInTheDocument();
  });

  it("does not show pagination for sample products", () => {
    renderPage();
    expect(screen.queryByText(/^\d+\/\d+$/)).not.toBeInTheDocument();
  });

  it("shows WooCommerce badge when woo data is present", () => {
    mockUseWooProducts.mockReturnValue({
      data: {
        products: [{ id: 1, name: "Woo Widget", price: "29.99", regular_price: "39.99", sale_price: "29.99", short_description: "<p>A widget</p>", stock_status: "instock", images: [] }],
        totalPages: 1,
        totalProducts: 1,
      },
    });
    renderPage();
    expect(screen.getByText("WooCommerce")).toBeInTheDocument();
  });

  it("renders WooCommerce products instead of samples", () => {
    mockUseWooProducts.mockReturnValue({
      data: {
        products: [{ id: 1, name: "Woo Widget", price: "29.99", regular_price: "39.99", sale_price: "", short_description: "<p>desc</p>", stock_status: "instock", images: [] }],
        totalPages: 1,
        totalProducts: 1,
      },
    });
    renderPage();
    expect(screen.getByText("Woo Widget")).toBeInTheDocument();
    expect(screen.queryByText("\u7121\u7DDA\u964D\u566A\u8033\u6A5F")).not.toBeInTheDocument();
  });

  it("shows WooCommerce product count", () => {
    mockUseWooProducts.mockReturnValue({
      data: {
        products: [{ id: 1, name: "P", price: "10", regular_price: "10", sale_price: "", short_description: "", stock_status: "instock", images: [] }],
        totalPages: 1,
        totalProducts: 25,
      },
    });
    renderPage();
    expect(screen.getByText("25 \u9805\u5546\u54C1")).toBeInTheDocument();
  });

  it("shows pagination when WooCommerce data has multiple pages", () => {
    mockUseWooProducts.mockReturnValue({
      data: {
        products: [{ id: 1, name: "P", price: "10", regular_price: "10", sale_price: "", short_description: "", stock_status: "instock", images: [] }],
        totalPages: 3,
        totalProducts: 30,
      },
    });
    renderPage();
    expect(screen.getByText("1/3")).toBeInTheDocument();
  });
});
