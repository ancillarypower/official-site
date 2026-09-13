import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/context/I18nContext";
import { CartPanel } from "@/components/store/CartPanel";
import { useCartStore } from "@/stores/cartStore";
import { useSettingsStore } from "@/stores/settingsStore";

function withProviders(ui: React.ReactElement) {
  return <MemoryRouter><I18nProvider>{ui}</I18nProvider></MemoryRouter>;
}

describe("CartPanel", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
    useSettingsStore.setState({ activePanel: "cart", wooKey: "" });
  });

  it("shows empty cart message", () => {
    render(withProviders(<CartPanel />));
    expect(screen.getByText(/\u8CFC\u7269\u8ECA\u662F\u7A7A\u7684/)).toBeInTheDocument();
  });

  it("renders cart title", () => {
    render(withProviders(<CartPanel />));
    expect(screen.getByText("\u8CFC\u7269\u8ECA")).toBeInTheDocument();
  });

  it("renders items with quantity controls", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "Headphones", price: 99.99, icon: "\uD83C\uDFA7", img: null, qty: 2 }],
    });
    render(withProviders(<CartPanel />));
    expect(screen.getByText("Headphones")).toBeInTheDocument();
    expect(screen.getByText("$99.99")).toBeInTheDocument();
    expect(screen.getByLabelText("Decrease")).toBeInTheDocument();
    expect(screen.getByLabelText("Increase")).toBeInTheDocument();
  });

  it("displays total price", () => {
    useCartStore.setState({
      items: [
        { id: 1, name: "A", price: 10, icon: null, img: null, qty: 2 },
        { id: 2, name: "B", price: 20, icon: null, img: null, qty: 1 },
      ],
    });
    render(withProviders(<CartPanel />));
    expect(screen.getByText("$40.00")).toBeInTheDocument();
  });

  it("disables checkout without WooCommerce", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "A", price: 10, icon: null, img: null, qty: 1 }],
    });
    render(withProviders(<CartPanel />));
    expect(screen.getByText("\u7D50\u5E33")).toBeDisabled();
  });

  it("does not show clear all button when cart is empty", () => {
    render(withProviders(<CartPanel />));
    expect(screen.queryByLabelText(/\u6E05\u7A7A\u8CFC\u7269\u8ECA/)).not.toBeInTheDocument();
  });

  it("shows clear all button when cart has items", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "A", price: 10, icon: null, img: null, qty: 1 }],
    });
    render(withProviders(<CartPanel />));
    expect(screen.getByLabelText(/\u6E05\u7A7A\u8CFC\u7269\u8ECA/)).toBeInTheDocument();
  });

  it("clears cart when clear all is confirmed", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "A", price: 10, icon: null, img: null, qty: 1 }],
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(withProviders(<CartPanel />));
    fireEvent.click(screen.getByLabelText(/\u6E05\u7A7A\u8CFC\u7269\u8ECA/));
    expect(useCartStore.getState().items).toHaveLength(0);
    vi.restoreAllMocks();
  });

  it("keeps items when clear all is cancelled", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "A", price: 10, icon: null, img: null, qty: 1 }],
    });
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(withProviders(<CartPanel />));
    fireEvent.click(screen.getByLabelText(/\u6E05\u7A7A\u8CFC\u7269\u8ECA/));
    expect(useCartStore.getState().items).toHaveLength(1);
    vi.restoreAllMocks();
  });
});
