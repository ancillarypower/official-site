import { describe, it, expect, vi, beforeEach } from "vitest";
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

  it("shows empty cart message when no items", () => {
    render(withProviders(<CartPanel />));
    expect(screen.getByText("\u8CFC\u7269\u8ECA\u662F\u7A7A\u7684\u3002")).toBeInTheDocument();
  });

  it("renders cart title", () => {
    render(withProviders(<CartPanel />));
    expect(screen.getByText("\u8CFC\u7269\u8ECA")).toBeInTheDocument();
  });

  it("renders close button", () => {
    render(withProviders(<CartPanel />));
    expect(screen.getByLabelText("Close")).toBeInTheDocument();
  });

  it("renders items with quantity controls", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "Headphones", price: 99.99, icon: "\uD83C\uDFA7", img: null, qty: 2 }],
    });
    render(withProviders(<CartPanel />));
    expect(screen.getByText("Headphones")).toBeInTheDocument();
    expect(screen.getByText("$99.99")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
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

  it("updates quantity via increase/decrease", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "A", price: 10, icon: null, img: null, qty: 2 }],
    });
    render(withProviders(<CartPanel />));
    fireEvent.click(screen.getByLabelText("Increase"));
    expect(useCartStore.getState().items[0]?.qty).toBe(3);
    fireEvent.click(screen.getByLabelText("Decrease"));
    expect(useCartStore.getState().items[0]?.qty).toBe(2);
  });

  it("disables checkout button when WooCommerce is not connected", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "A", price: 10, icon: null, img: null, qty: 1 }],
    });
    useSettingsStore.setState({ wooKey: "" });
    render(withProviders(<CartPanel />));
    expect(screen.getByText("\u7D50\u5E33")).toBeDisabled();
  });

  it("renders billing form when items present", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "A", price: 10, icon: null, img: null, qty: 1 }],
    });
    render(withProviders(<CartPanel />));
    expect(screen.getByPlaceholderText("\u540D\u5B57")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("\u59D3\u6C0F")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
  });

  it("renders item icon when no image", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "A", price: 10, icon: "\uD83C\uDFA7", img: null, qty: 1 }],
    });
    render(withProviders(<CartPanel />));
    expect(screen.getByText("\uD83C\uDFA7")).toBeInTheDocument();
  });
});
