import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/context/I18nContext";
import { CartPanel } from "@/components/store/CartPanel";
import { useCartStore, MAX_CART_QTY } from "@/stores/cartStore";
import { useSettingsStore } from "@/stores/settingsStore";

vi.mock("@/hooks/useWooCommerce", () => ({
  useCheckout: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

function withProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <I18nProvider>{ui}</I18nProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function setItemQty(qty: number) {
  useCartStore.setState({
    items: [{ id: 1, name: "Headphones", price: 10, icon: "🎧", img: null, qty }],
  });
}

describe("CartPanel increase button at qty cap (regression #593)", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
    useSettingsStore.setState({ activePanel: "cart" });
  });

  it("MAX_CART_QTY is 99", () => {
    expect(MAX_CART_QTY).toBe(99);
  });

  it("disables the increase button when qty is at the cap", () => {
    setItemQty(MAX_CART_QTY);
    render(withProviders(<CartPanel />));
    expect(screen.getByLabelText("增加數量")).toBeDisabled();
  });

  it("keeps the increase button enabled below the cap", () => {
    setItemQty(MAX_CART_QTY - 1);
    render(withProviders(<CartPanel />));
    expect(screen.getByLabelText("增加數量")).not.toBeDisabled();
  });

  it("disables the increase button once a click reaches the cap", () => {
    setItemQty(MAX_CART_QTY - 1);
    render(withProviders(<CartPanel />));
    const increase = screen.getByLabelText("增加數量");
    fireEvent.click(increase);
    expect(useCartStore.getState().items[0]?.qty).toBe(MAX_CART_QTY);
    expect(screen.getByLabelText("增加數量")).toBeDisabled();
  });

  it("clicking the disabled increase button does not exceed the cap", () => {
    setItemQty(MAX_CART_QTY);
    render(withProviders(<CartPanel />));
    fireEvent.click(screen.getByLabelText("增加數量"));
    expect(useCartStore.getState().items[0]?.qty).toBe(MAX_CART_QTY);
  });

  it("keeps the decrease button enabled at the cap", () => {
    setItemQty(MAX_CART_QTY);
    render(withProviders(<CartPanel />));
    const decrease = screen.getByLabelText("減少數量");
    expect(decrease).not.toBeDisabled();
    fireEvent.click(decrease);
    expect(useCartStore.getState().items[0]?.qty).toBe(MAX_CART_QTY - 1);
    expect(screen.getByLabelText("增加數量")).not.toBeDisabled();
  });
});
