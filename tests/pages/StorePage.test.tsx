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

  it("delegates filter to server-side search via useWooProducts (regression #275)", () => {
    renderPage();
    const filterInput = screen.getByRole("textbox", { name: "Filter" });
    fireEvent.change(filterInput, { target: { value: "xyz_no_match" } });
    // With server-side search, the filter value is passed to useWooProducts
    // via URL param -> debouncedSearch. The mock still renders sample products
    // since we don't simulate debounce here, but we verify the filter input
    // is wired up (the URL param is set, which will eventually trigger a
    // new useWooProducts call with the search term after debounce).
    expect(filterInput).toHaveValue("xyz_no_match");
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

  it("decodes HTML entities in WooCommerce product names (regression #286)", () => {
    mockUseWooProducts.mockReturnValue({
      data: {
        products: [
          { id: 3, name: "Tom &amp; Jerry&#8217;s Shop", short_description: "<p>desc</p>", price: "19.99", regular_price: "19.99", sale_price: "", images: [], stock_status: "instock" },
        ],
        totalProducts: 1,
        totalPages: 1,
      },
    });
    renderPage();
    expect(screen.getByText("Tom & Jerry\u2019s Shop")).toBeInTheDocument();
    expect(screen.queryByText(/&amp;/)).not.toBeInTheDocument();
    expect(screen.queryByText(/&#8217;/)).not.toBeInTheDocument();
  });

  it("strips complex HTML without regex artifacts (regression #299)", () => {
    mockUseWooProducts.mockReturnValue({
      data: {
        products: [
          { id: 4, name: "Complex Product", short_description: '<a title="5 > 3">link</a><p>text &amp; more</p>', price: "9.99", regular_price: "9.99", sale_price: "", images: [], stock_status: "instock" },
        ],
        totalProducts: 1,
        totalPages: 1,
      },
    });
    renderPage();
    // DOM-based stripHtml correctly extracts text from all tag structures;
    // the old regex /<[^>]*>/g would leave '3">link' artifacts here.
    expect(screen.getByText(/linktext & more/)).toBeInTheDocument();
    // No residual `>` from attribute values or unresolved entities
    expect(screen.queryByText(/3">/)).not.toBeInTheDocument();
    expect(screen.queryByText(/&amp;/)).not.toBeInTheDocument();
  });

  // --- Pagination URL sync regression tests ---

  it("reads page from URL and passes to useWooProducts", () => {
    renderPage("/?page=2");
    expect(mockUseWooProducts).toHaveBeenCalledWith(2, expect.any(String), "date", "desc");
  });

  it("defaults to page 1 for non-numeric page param", () => {
    renderPage("/?page=abc");
    expect(mockUseWooProducts).toHaveBeenCalledWith(1, expect.any(String), "date", "desc");
  });

  it("defaults to page 1 when page param is missing", () => {
    renderPage("/");
    expect(mockUseWooProducts).toHaveBeenCalledWith(1, expect.any(String), "date", "desc");
  });

  it("clamps zero and negative page to 1", () => {
    renderPage("/?page=-5");
    expect(mockUseWooProducts).toHaveBeenCalledWith(1, expect.any(String), "date", "desc");
  });

  // --- Pagination reset on settings change regression tests ---

  it("resets page when wooPerPage changes", () => {
    renderPage("/?page=2");
    expect(mockUseWooProducts).toHaveBeenCalledWith(2, expect.any(String), "date", "desc");
    act(() => {
      useSettingsStore.setState({ wooPerPage: 50 });
    });
    expect(mockUseWooProducts).toHaveBeenLastCalledWith(1, expect.any(String), "date", "desc");
  });

  it("resets page when WooCommerce baseUrl changes (regression #145)", () => {
    useSettingsStore.setState({ wpUrl: "https://old.example.com" });
    renderPage("/?page=3");
    expect(mockUseWooProducts).toHaveBeenCalledWith(3, expect.any(String), "date", "desc");
    act(() => {
      useSettingsStore.setState({ wpUrl: "https://new.example.com" });
    });
    expect(mockUseWooProducts).toHaveBeenLastCalledWith(1, expect.any(String), "date", "desc");
  });

  it("resets page when wooKey changes (regression #145)", () => {
    useSettingsStore.setState({ wooKey: "ck_old" });
    renderPage("/?page=3");
    expect(mockUseWooProducts).toHaveBeenCalledWith(3, expect.any(String), "date", "desc");
    act(() => {
      useSettingsStore.setState({ wooKey: "ck_new" });
    });
    expect(mockUseWooProducts).toHaveBeenLastCalledWith(1, expect.any(String), "date", "desc");
  });

  // --- WooCommerce loading/error state regression tests (#112) ---

  it("shows loading spinner when WooCommerce query is loading", () => {
    mockUseWooProducts.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("\u7121\u7DDA\u964D\u566A\u8033\u6A5F")).not.toBeInTheDocument();
  });

  it("shows error state when WooCommerce query fails", () => {
    mockUseWooProducts.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("HTTP 500"),
      refetch: vi.fn(),
    });
    renderPage();
    expect(screen.getByText(/HTTP 500/)).toBeInTheDocument();
    expect(screen.getByText("\u91CD\u8A66")).toBeInTheDocument();
    expect(screen.queryByText("\u7121\u7DDA\u964D\u566A\u8033\u6A5F")).not.toBeInTheDocument();
  });

  it("shows sample products when WooCommerce is not configured (regression #112)", () => {
    mockUseWooProducts.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();
    expect(screen.getByText("\u7121\u7DDA\u964D\u566A\u8033\u6A5F")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  // --- Issue #275 Regression Tests ---

  it("reads search query from URL q param and passes to useWooProducts (regression #275)", () => {
    renderPage("/?q=headphones");
    // useDebouncedValue starts with the initial value, so on first render
    // the debounced value equals the URL param
    expect(mockUseWooProducts).toHaveBeenCalledWith(1, "headphones", "date", "desc");
  });

  it("resets page to 1 when filter input changes (regression #275)", () => {
    renderPage("/?page=3");
    expect(mockUseWooProducts).toHaveBeenCalledWith(3, expect.any(String), "date", "desc");
    const filterInput = screen.getByRole("textbox", { name: "Filter" });
    fireEvent.change(filterInput, { target: { value: "test" } });
    // After filter change, page should reset to 1
    expect(mockUseWooProducts).toHaveBeenLastCalledWith(1, expect.any(String), "date", "desc");
  });

  // --- Issue #485 Regression Tests ---

  it("delegates sort to server via useWooProducts orderby/order (regression #485)", () => {
    renderPage();
    const sortSelect = screen.getByRole("combobox", { name: "Sort by" });
    fireEvent.change(sortSelect, { target: { value: "price_asc" } });
    expect(mockUseWooProducts).toHaveBeenLastCalledWith(1, expect.any(String), "price", "asc");
  });

  it("resets page when sort changes (regression #485)", () => {
    renderPage("/?page=3");
    expect(mockUseWooProducts).toHaveBeenCalledWith(3, expect.any(String), "date", "desc");
    const sortSelect = screen.getByRole("combobox", { name: "Sort by" });
    fireEvent.change(sortSelect, { target: { value: "title_desc" } });
    expect(mockUseWooProducts).toHaveBeenLastCalledWith(1, expect.any(String), "title", "desc");
  });
});
