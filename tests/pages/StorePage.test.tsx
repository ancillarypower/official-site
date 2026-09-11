import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/context/I18nContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCartStore } from "@/stores/cartStore";

const mockUseWooProducts = vi.fn();

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
    expect(screen.getByText("\u6A5F\u68B0\u5F0F\u9375\u76E4")).toBeInTheDocument();
  });

  it("displays total product count", () => {
    renderPage();
    expect(screen.getByText("8 \u9805\u5546\u54C1")).toBeInTheDocument();
  });

  it("renders search toolbar", () => {
    renderPage();
    expect(screen.getByPlaceholderText("\u641C\u5C0B\u5546\u54C1...")).toBeInTheDocument();
  });

  it("does not show WooCommerce badge for sample products", () => {
    renderPage();
    expect(screen.queryByText("WooCommerce")).toBeNull();
  });
});
