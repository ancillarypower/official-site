import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/context/I18nContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCartStore } from "@/stores/cartStore";
import { useSettingsStore } from "@/stores/settingsStore";

const { mockUseWooProducts } = vi.hoisted(() => ({
  mockUseWooProducts: vi.fn(),
}));

vi.mock("@/hooks/useWooCommerce", () => ({
  useWooProducts: (...args: unknown[]) => mockUseWooProducts(...args),
  useCheckout: () => ({ mutateAsync: vi.fn() }),
}));

import StorePage from "@/pages/StorePage";

function renderPage(route = "/") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>
        <I18nProvider>
          <StorePage />
        </I18nProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("StorePage", () => {
  beforeEach(() => {
    mockUseWooProducts.mockClear();
    useCartStore.setState({ items: [] });
    useSettingsStore.setState({ wooPerPage: 20 });
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
    const filterInput = screen.getByRole("textbox", { name: "Filter" });
    fireEvent.change(filterInput, { target: { value: "xyz_no_match" } });
    expect(screen.queryByText("\u7121\u7DDA\u964D\u566A\u8033\u6A5F")).not.toBeInTheDocument();
  });

  it("sorts products by price ascending", () => {
    renderPage();
    const sortSelect = screen.getByRole("combobox", { name: "Sort by" });
    fireEvent.change(sortSelect, { target: { value: "price_asc" } });
    expect(screen.getByText("\u7121\u7DDA\u964D\u566A\u8033\u6A5F")).toBeInTheDocument();
  });

  it("sorts products by price descending", () => {
    renderPage();
    const sortSelect = screen.getByRole("combobox", { name: "Sort by" });
    fireEvent.change(sortSelect, { target: { value: "price_desc" } });
    expect(screen.getByText("\u7121\u7DDA\u964D\u566A\u8033\u6A5F")).toBeInTheDocument();
  });

  it("sorts products by title ascending", () => {
    renderPage();
    const sortSelect = screen.getByRole("combobox", { name: "Sort by" });
    fireEvent.change(sortSelect, { target: { value: "title_asc" } });
    expect(screen.getByText("\u7121\u7DDA\u964D\u566A\u8033\u6A5F")).toBeInTheDocument();
  });

  it("sorts products by title descending", () => {
    renderPage();
    const sortSelect = screen.getByRole("combobox", { name: "Sort by" });
    fireEvent.change(sortSelect, { target: { value: "title_desc" } });
    expect(screen.getByText("\u7121\u7DDA\u964D\u566A\u8033\u6A5F")).toBeInTheDocument();
  });

  it("renders WooCommerce products with badge and pagination", () => {
    mockUseWooProducts.mockReturnValue({
      data: {
        products: [
          { id: 1, name: "WC Product", short_description: "<p>desc</p>", price: "29.99", regular_price: "29.99", sale_price: "", images: [{ src: "https://example.com/img.jpg" }], stock_status: "instock" },
        ],
        totalProducts: 30,
        totalPages: 3,
      },
    });
    renderPage();
    expect(screen.getByText("WC Product")).toBeInTheDocument();
    expect(screen.getByText(/WooCommerce/)).toBeInTheDocument();
    expect(screen.getByText("1/3")).toBeInTheDocument();
  });

  it("decodes HTML entities in WooCommerce product descriptions", () => {
    mockUseWooProducts.mockReturnValue({
      data: {
        products: [
          { id: 2, name: "Entity Product", short_description: "<p>Premium headphones &amp; accessories &#8217;best&#8217;</p>", price: "49.99", regular_price: "49.99", sale_price: "", images: [], stock_status: "instock" },
        ],
        totalProducts: 1,
        totalPages: 1,
      },
    });
    renderPage();
    expect(screen.getByText("Entity Product")).toBeInTheDocument();
    expect(screen.getByText(/Premium headphones & accessories/)).toBeInTheDocument();
    expect(screen.queryByText(/&amp;/)).not.toBeInTheDocument();
  });

  // --- Pagination URL sync regression tests ---

  it("reads page from URL and passes to useWooProducts", () => {
    renderPage("/?page=2");
    expect(mockUseWooProducts).toHaveBeenCalledWith(2);
  });

  it("defaults to page 1 for non-numeric page param", () => {
    renderPage("/?page=abc");
    expect(mockUseWooProducts).toHaveBeenCalledWith(1);
  });

  it("defaults to page 1 when page param is missing", () => {
    renderPage("/");
    expect(mockUseWooProducts).toHaveBeenCalledWith(1);
  });

  it("clamps zero and negative page to 1", () => {
    renderPage("/?page=-5");
    expect(mockUseWooProducts).toHaveBeenCalledWith(1);
  });

  // --- Pagination reset on settings change regression tests ---

  it("resets page when wooPerPage changes", () => {
    renderPage("/?page=2");
    expect(mockUseWooProducts).toHaveBeenCalledWith(2);
    act(() => {
      useSettingsStore.setState({ wooPerPage: 50 });
    });
    expect(mockUseWooProducts).toHaveBeenLastCalledWith(1);
  });
});
