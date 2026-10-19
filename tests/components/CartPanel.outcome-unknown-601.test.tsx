/**
 * Regression tests for Issue #601 (UI side):
 * when useCheckout reports OrderOutcomeUnknownError, the order may already
 * exist on WooCommerce. CartPanel must keep the cart, lock the checkout
 * button, show the client order reference, and only allow a resubmit after
 * the user confirms. The resubmit must reuse the same reference.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/context/I18nContext";
import { CartPanel } from "@/components/store/CartPanel";
import { useCartStore } from "@/stores/cartStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { OrderOutcomeUnknownError } from "@/lib/errors";

const { mockCheckout } = vi.hoisted(() => ({
  mockCheckout: vi.fn(),
}));
vi.mock("@/hooks/useWooCommerce", () => ({
  useCheckout: () => ({
    mutateAsync: mockCheckout,
    isPending: false,
  }),
}));

const CHECKOUT_LABEL = "\u7D50\u5E33";
const RETRY_LABEL = "\u6211\u6C92\u6709\u6536\u5230\u78BA\u8A8D\u4FE1\uFF0C\u91CD\u65B0\u9001\u51FA";

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

function fillAllBillingFields(container: HTMLElement) {
  const inputs = container.querySelectorAll<HTMLInputElement>("input");
  fireEvent.change(inputs[0]!, { target: { value: "John" } });
  fireEvent.change(inputs[1]!, { target: { value: "Doe" } });
  fireEvent.change(inputs[2]!, { target: { value: "john@example.com" } });
  fireEvent.change(inputs[3]!, { target: { value: "0912345678" } });
  fireEvent.change(inputs[4]!, { target: { value: "123 Main St" } });
  fireEvent.change(inputs[5]!, { target: { value: "Taipei" } });
  fireEvent.change(inputs[6]!, { target: { value: "100" } });
}

function checkoutButton(): HTMLButtonElement {
  return screen.getByText(CHECKOUT_LABEL).closest("button") as HTMLButtonElement;
}

function firstRef(): string {
  return (mockCheckout.mock.calls[0]?.[0] as { clientOrderRef?: string }).clientOrderRef as string;
}

async function submitAndWaitForUnknown() {
  const { container } = render(withProviders(<CartPanel />));
  fillAllBillingFields(container);
  fireEvent.click(checkoutButton());
  await screen.findByRole("alert");
}

describe("CartPanel unknown order outcome (regression #601)", () => {
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
    mockCheckout.mockReset();
    mockCheckout.mockRejectedValue(
      new OrderOutcomeUnknownError("error_checkout_outcome_unknown", "Order outcome unknown"),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the cart, locks checkout and shows the order reference", async () => {
    await submitAndWaitForUnknown();

    const ref = firstRef();
    expect(typeof ref).toBe("string");
    expect(ref.length).toBeGreaterThan(0);
    expect(screen.getByRole("alert").textContent).toContain(ref);
    expect(checkoutButton()).toBeDisabled();
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it("does not submit again while the outcome is unknown", async () => {
    await submitAndWaitForUnknown();

    fireEvent.click(checkoutButton());
    expect(mockCheckout).toHaveBeenCalledTimes(1);
  });

  it("stays locked when the user cancels the resubmit confirmation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    await submitAndWaitForUnknown();

    fireEvent.click(screen.getByText(RETRY_LABEL));
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(checkoutButton()).toBeDisabled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("resubmits with the same client order reference after confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await submitAndWaitForUnknown();
    const ref = firstRef();

    fireEvent.click(screen.getByText(RETRY_LABEL));
    expect(checkoutButton()).not.toBeDisabled();

    mockCheckout.mockResolvedValueOnce({ id: 601, order_key: "wc_order_601", payment_url: "" });
    fireEvent.click(checkoutButton());
    await waitFor(() => {
      expect(mockCheckout).toHaveBeenCalledTimes(2);
    });
    expect((mockCheckout.mock.calls[1]?.[0] as { clientOrderRef?: string }).clientOrderRef).toBe(ref);
  });
});
