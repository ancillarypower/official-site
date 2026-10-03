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

/** Fill billing fields 0-6; index 7 is country and is set per test. */
function fillBillingFields(container: HTMLElement) {
  const inputs = container.querySelectorAll<HTMLInputElement>("input");
  fireEvent.change(inputs[0]!, { target: { value: "John" } });
  fireEvent.change(inputs[1]!, { target: { value: "Doe" } });
  fireEvent.change(inputs[2]!, { target: { value: "john@example.com" } });
  fireEvent.change(inputs[3]!, { target: { value: "0912345678" } });
  fireEvent.change(inputs[4]!, { target: { value: "123 Main St" } });
  fireEvent.change(inputs[5]!, { target: { value: "Taipei" } });
  fireEvent.change(inputs[6]!, { target: { value: "100" } });
}

// "\u7D50\u5E33" = zh checkout button label
const CHECKOUT_LABEL = "\u7D50\u5E33";

describe("CartPanel country code normalization (regression #584)", () => {
  beforeEach(() => {
    useCartStore.setState({
      items: [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 2 }],
    });
    useSettingsStore.setState({
      activePanel: "cart",
      wooKey: "ck_test",
      wooSecret: "cs_test",
      wpUrl: "https://shop.example.com",
      wooUseSameUrl: true,
    });
    mockCheckout.mockClear();
    mockCheckout.mockResolvedValue({ id: 100, order_key: "wc_order_test" });
  });

  it("sends an uppercase billing country when the user types lowercase (regression #584)", async () => {
    const { container } = render(withProviders(<CartPanel />));
    fillBillingFields(container);
    const inputs = container.querySelectorAll<HTMLInputElement>("input");
    fireEvent.change(inputs[7]!, { target: { value: "tw" } });
    fireEvent.click(screen.getByText(CHECKOUT_LABEL));
    await waitFor(() => {
      expect(mockCheckout).toHaveBeenCalledTimes(1);
    });
    const callArgs = mockCheckout.mock.calls[0]![0];
    expect(callArgs.billing.country).toBe("TW");
  });

  it("sends an uppercase, trimmed shipping country when shipping differs from billing (regression #584)", async () => {
    const { container } = render(withProviders(<CartPanel />));
    fillBillingFields(container);
    const checkboxes = container.querySelectorAll<HTMLInputElement>("input[type='checkbox']");
    fireEvent.click(checkboxes[0]!);
    const allInputs = container.querySelectorAll<HTMLInputElement>("input");
    // 0-7 billing, 8 checkbox, 9-14 shipping (14 = country)
    fireEvent.change(allInputs[9]!, { target: { value: "Jane" } });
    fireEvent.change(allInputs[10]!, { target: { value: "Smith" } });
    fireEvent.change(allInputs[11]!, { target: { value: "456 Oak Ave" } });
    fireEvent.change(allInputs[12]!, { target: { value: "Osaka" } });
    fireEvent.change(allInputs[13]!, { target: { value: "530-0001" } });
    fireEvent.change(allInputs[14]!, { target: { value: " jp " } });
    fireEvent.click(screen.getByText(CHECKOUT_LABEL));
    await waitFor(() => {
      expect(mockCheckout).toHaveBeenCalledTimes(1);
    });
    const callArgs = mockCheckout.mock.calls[0]![0];
    expect(callArgs.billing.country).toBe("TW");
    expect(callArgs.shipping.country).toBe("JP");
  });

  it("still rejects an invalid lowercase country code (regression #584)", async () => {
    const { container } = render(withProviders(<CartPanel />));
    fillBillingFields(container);
    const inputs = container.querySelectorAll<HTMLInputElement>("input");
    fireEvent.change(inputs[7]!, { target: { value: "zz" } });
    fireEvent.click(screen.getByText(CHECKOUT_LABEL));
    expect(mockCheckout).not.toHaveBeenCalled();
  });
});
