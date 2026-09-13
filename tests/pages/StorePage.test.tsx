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

  it("shows sample products", () => {
    renderPage();
    expect(screen.getByText("\u7121\u7DDA\u964D\u566A\u8033\u6A5F")).toBeInTheDocument();
  });

  it("shows product count", () => {
    renderPage();
    expect(screen.getByText("8 \u9805\u5546\u54C1")).toBeInTheDocument();
  });
});
