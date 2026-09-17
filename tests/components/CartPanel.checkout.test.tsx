import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/context/I18nContext";
import { CartPanel } from "@/components/store/CartPanel";
import { useCartStore } from "@/stores/cartStore";
import { useSettingsStore } from "@/stores/settingsStore";

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

describe("CartPanel checkout success flow", () => {
  beforeEach(() => {
    useCartStore.setState({
      items: [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 2 }],
    });
    useSettingsStore.setState({ activePanel: "cart", wooKey: "ck_test" });
    mockCheckout.mockClear();
    mockCheckout.mockResolvedValue({ id: 100, order_key: "wc_order_test" });
  });

  it("shows clear cart link after successful checkout", async () => {
    const { container } = render(withProviders(<CartPanel />));
    const inputs = container.querySelectorAll<HTMLInputElement>("input");
    fireEvent.change(inputs[0]!, { target: { value: "John" } });
    fireEvent.change(inputs[1]!, { target: { value: "Doe" } });
    fireEvent.change(inputs[2]!, { target: { value: "john@example.com" } });
    fireEvent.click(screen.getByText("\u7D50\u5E33"));
    await waitFor(() => {
      expect(mockCheckout).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      const links = screen.getAllByText(/\u6E05\u7A7A\u8CFC\u7269\u8ECA/);
      expect(links.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("updates billing fields via form inputs", () => {
    const { container } = render(withProviders(<CartPanel />));
    const inputs = container.querySelectorAll<HTMLInputElement>("input");
    fireEvent.change(inputs[3]!, { target: { value: "0912345678" } });
    fireEvent.change(inputs[4]!, { target: { value: "123 Main St" } });
    fireEvent.change(inputs[5]!, { target: { value: "Taipei" } });
    fireEvent.change(inputs[6]!, { target: { value: "100" } });
    fireEvent.change(inputs[7]!, { target: { value: "TW" } });
    expect(inputs[3]).toHaveValue("0912345678");
    expect(inputs[4]).toHaveValue("123 Main St");
    expect(inputs[5]).toHaveValue("Taipei");
    expect(inputs[6]).toHaveValue("100");
  });

  it("shows no-woo note when wooKey is empty", () => {
    useSettingsStore.setState({ wooKey: "" });
    render(withProviders(<CartPanel />));
    expect(screen.getByText(/WooCommerce/)).toBeInTheDocument();
  });

  it("shows checkout note when wooKey is set", () => {
    render(withProviders(<CartPanel />));
    expect(screen.queryByText(/\u8ACB\u5148\u9023\u63A5 WooCommerce/)).not.toBeInTheDocument();
  });

  it("handles non-Error checkout failure gracefully", async () => {
    mockCheckout.mockRejectedValueOnce("string error");
    const { container } = render(withProviders(<CartPanel />));
    const inputs = container.querySelectorAll<HTMLInputElement>("input");
    fireEvent.change(inputs[0]!, { target: { value: "John" } });
    fireEvent.change(inputs[1]!, { target: { value: "Doe" } });
    fireEvent.change(inputs[2]!, { target: { value: "john@example.com" } });
    fireEvent.click(screen.getByText("\u7D50\u5E33"));
    await waitFor(() => {
      expect(screen.getByText("Checkout failed")).toBeInTheDocument();
    });
  });

  it("clears validation error when user edits a billing field (regression #95)", () => {
    const { container } = render(withProviders(<CartPanel />));
    fireEvent.click(screen.getByText("\u7D50\u5E33"));
    expect(screen.getByText(/\u8ACB\u586B\u5BEB\u59D3\u540D/)).toBeInTheDocument();
    const inputs = container.querySelectorAll<HTMLInputElement>("input");
    fireEvent.change(inputs[0]!, { target: { value: "J" } });
    expect(screen.queryByText(/\u8ACB\u586B\u5BEB\u59D3\u540D/)).not.toBeInTheDocument();
  });

  it("clears previous error at start of handleCheckout retry (regression #95)", () => {
    const { container } = render(withProviders(<CartPanel />));
    fireEvent.click(screen.getByText("\u7D50\u5E33"));
    expect(screen.getByText(/\u8ACB\u586B\u5BEB\u59D3\u540D/)).toBeInTheDocument();
    const inputs = container.querySelectorAll<HTMLInputElement>("input");
    fireEvent.change(inputs[0]!, { target: { value: "John" } });
    fireEvent.change(inputs[1]!, { target: { value: "Doe" } });
    fireEvent.change(inputs[2]!, { target: { value: "john@example.com" } });
    fireEvent.click(screen.getByText("\u7D50\u5E33"));
    expect(screen.queryByText(/\u8ACB\u586B\u5BEB\u59D3\u540D/)).not.toBeInTheDocument();
  });
});
