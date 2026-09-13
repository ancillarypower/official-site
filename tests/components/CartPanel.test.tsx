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

  it("increases item quantity", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "Headphones", price: 99.99, icon: "\uD83C\uDFA7", img: null, qty: 1 }],
    });
    render(withProviders(<CartPanel />));
    fireEvent.click(screen.getByLabelText("Increase"));
    expect(useCartStore.getState().items[0]?.qty).toBe(2);
  });

  it("removes item when quantity reaches zero", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "Headphones", price: 99.99, icon: "\uD83C\uDFA7", img: null, qty: 1 }],
    });
    render(withProviders(<CartPanel />));
    fireEvent.click(screen.getByLabelText("Decrease"));
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("closes panel when close button is clicked", () => {
    useSettingsStore.setState({ activePanel: "cart" });
    render(withProviders(<CartPanel />));
    fireEvent.click(screen.getByLabelText("Close"));
    expect(useSettingsStore.getState().activePanel).toBeNull();
  });

  it("renders item image when available", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "Widget", price: 25, icon: null, img: "https://example.com/img.jpg", qty: 1 }],
    });
    const { container } = render(withProviders(<CartPanel />));
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "https://example.com/img.jpg");
  });

  it("renders default icon when no image or icon", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "Widget", price: 25, icon: null, img: null, qty: 1 }],
    });
    render(withProviders(<CartPanel />));
    expect(screen.getByText("\uD83D\uDCE6")).toBeInTheDocument();
  });

  it("enables checkout when WooCommerce is connected", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "A", price: 10, icon: null, img: null, qty: 1 }],
    });
    useSettingsStore.setState({ wooKey: "ck_test" });
    render(withProviders(<CartPanel />));
    expect(screen.getByText("\u7D50\u5E33")).not.toBeDisabled();
  });

  it("renders billing form when cart has items", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "A", price: 10, icon: null, img: null, qty: 1 }],
    });
    render(withProviders(<CartPanel />));
    const inputs = screen.getAllByRole("textbox");
    expect(inputs.length).toBeGreaterThanOrEqual(2);
  });
});
