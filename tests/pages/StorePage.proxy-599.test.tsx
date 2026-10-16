import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

const PROXY_NOTICE = /\u4EE3\u7406\u6A21\u5F0F\u4E0B\u7121\u6CD5\u8F09\u5165\u5546\u54C1/; // 代理模式下無法載入商品
const SAMPLE_PRODUCT = "\u7121\u7DDA\u964D\u566A\u8033\u6A5F"; // 無線降噪耳機
const RETRY = "\u91CD\u8A66"; // 重試

describe("StorePage in proxy mode (regression #599)", () => {
  beforeEach(() => {
    mockUseWooProducts.mockClear();
    useCartStore.setState({ items: [] });
    useSettingsStore.setState({ wooPerPage: 20, useProxy: false });
    // With the query disabled in proxy mode, the hook reports no data,
    // no loading and no error.
    mockUseWooProducts.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("shows the proxy notice together with sample products", () => {
    useSettingsStore.setState({ useProxy: true });
    renderPage();
    expect(screen.getByText(PROXY_NOTICE)).toBeInTheDocument();
    expect(screen.getByText(SAMPLE_PRODUCT)).toBeInTheDocument();
    expect(screen.queryByText(RETRY)).not.toBeInTheDocument();
  });

  it("does not show the proxy notice in direct mode", () => {
    renderPage();
    expect(screen.queryByText(PROXY_NOTICE)).not.toBeInTheDocument();
    expect(screen.getByText(SAMPLE_PRODUCT)).toBeInTheDocument();
  });
});
