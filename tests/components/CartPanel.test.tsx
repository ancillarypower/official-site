import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/context/I18nContext";
import { CartPanel } from "@/components/store/CartPanel";
import { useCartStore } from "@/stores/cartStore";
import { useSettingsStore } from "@/stores/settingsStore";

/* ── Mock useCheckout (Issue #44 regression) ── */
const { mockCheckout } = vi.hoisted(() => ({
  mockCheckout: vi.fn().mockResolvedValue({ id: 100, order_key: "wc_order_test" }),
}));
vi.mock("@/hooks/useWooCommerce", () => ({
  useCheckout: () => ({
    mutateAsync: mockCheckout,
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

describe("CartPanel", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
    useSettingsStore.setState({ activePanel: "cart", wooKey: "" });
    mockCheckout.mockClear();
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

  it("increases item quantity when increase button is clicked", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "Headphones", price: 99.99, icon: "\uD83C\uDFA7", img: null, qty: 1 }],
    });
    render(withProviders(<CartPanel />));
    fireEvent.click(screen.getByLabelText("Increase"));
    expect(useCartStore.getState().items[0]?.qty).toBe(2);
  });

  it("removes item when quantity reaches zero via decrease", () => {
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
    fireEvent.click(screen.getByLabelText("關閉"));
    expect(useSettingsStore.getState().activePanel).toBeNull();
  });

  it("renders item image when available", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "Widget", price: 25, icon: null, img: "https://example.com/img.jpg", qty: 1 }],
    });
    const { container } = render(withProviders(<CartPanel />));
    const img = container.querySelector("img");
    expect(img).toBeInTheDocument();
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

  it("handles checkout click safely", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "A", price: 10, icon: null, img: null, qty: 1 }],
    });
    useSettingsStore.setState({ wooKey: "ck_test" });
    render(withProviders(<CartPanel />));
    expect(() => {
      fireEvent.click(screen.getByText("\u7D50\u5E33"));
    }).not.toThrow();
  });

  /* ── Issue #44 Regression Tests ── */

  it("calls checkout mutation with items and billing on valid checkout", async () => {
    useCartStore.setState({
      items: [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 2 }],
    });
    useSettingsStore.setState({ wooKey: "ck_test" });
    const { container } = render(withProviders(<CartPanel />));

    const inputs = container.querySelectorAll<HTMLInputElement>("input");
    fireEvent.change(inputs[0]!, { target: { value: "John" } });
    fireEvent.change(inputs[1]!, { target: { value: "Doe" } });
    fireEvent.change(inputs[2]!, { target: { value: "john@example.com" } });

    fireEvent.click(screen.getByText("\u7D50\u5E33"));

    await waitFor(() => {
      expect(mockCheckout).toHaveBeenCalledTimes(1);
    });
    expect(mockCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ id: 1, name: "Widget", qty: 2 }),
        ]),
        billing: expect.objectContaining({
          first_name: "John",
          last_name: "Doe",
          email: "john@example.com",
        }),
      }),
    );
  });

  it("shows error message when checkout fails", async () => {
    mockCheckout.mockRejectedValueOnce(new Error("Payment gateway unavailable"));
    useCartStore.setState({
      items: [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 1 }],
    });
    useSettingsStore.setState({ wooKey: "ck_test" });
    const { container } = render(withProviders(<CartPanel />));

    const inputs = container.querySelectorAll<HTMLInputElement>("input");
    fireEvent.change(inputs[0]!, { target: { value: "John" } });
    fireEvent.change(inputs[1]!, { target: { value: "Doe" } });
    fireEvent.change(inputs[2]!, { target: { value: "john@example.com" } });

    fireEvent.click(screen.getByText("\u7D50\u5E33"));

    await waitFor(() => {
      expect(screen.getByText("Payment gateway unavailable")).toBeInTheDocument();
    });
  });

  it("does not call checkout when required billing fields are empty", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 1 }],
    });
    useSettingsStore.setState({ wooKey: "ck_test" });
    render(withProviders(<CartPanel />));

    fireEvent.click(screen.getByText("\u7D50\u5E33"));

    expect(mockCheckout).not.toHaveBeenCalled();
  });

  /* ── Issue #75 Regression Test ── */

  it("shows field validation error instead of WooCommerce error when billing is incomplete", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 1 }],
    });
    useSettingsStore.setState({ wooKey: "ck_test" });
    render(withProviders(<CartPanel />));

    fireEvent.click(screen.getByText("\u7D50\u5E33"));

    expect(screen.getByText(/\u8ACB\u586B\u5BEB\u59D3\u540D\u8207 Email/)).toBeInTheDocument();
    expect(screen.queryByText(/\u8ACB\u5148\u9023\u63A5 WooCommerce/)).not.toBeInTheDocument();
  });
});
