import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/context/I18nContext";
import { CartPanel } from "@/components/store/CartPanel";
import { useCartStore } from "@/stores/cartStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { AppError } from "@/lib/errors";

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

/** Helper: set all three WooCommerce credentials so wooConnected = true */
function setWooConnected() {
  useSettingsStore.setState({
    wooKey: "ck_test",
    wooSecret: "cs_test",
    wpUrl: "https://shop.example.com",
    wooUseSameUrl: true,
  });
}

/** Helper: fill all 8 billing fields so the 8-field validation passes */
function fillAllBillingFields(container: HTMLElement) {
  const inputs = container.querySelectorAll<HTMLInputElement>("input");
  fireEvent.change(inputs[0]!, { target: { value: "John" } });
  fireEvent.change(inputs[1]!, { target: { value: "Doe" } });
  fireEvent.change(inputs[2]!, { target: { value: "john@example.com" } });
  fireEvent.change(inputs[3]!, { target: { value: "0912345678" } });
  fireEvent.change(inputs[4]!, { target: { value: "123 Main St" } });
  fireEvent.change(inputs[5]!, { target: { value: "Taipei" } });
  fireEvent.change(inputs[6]!, { target: { value: "100" } });
  // inputs[7] = country, already defaults to "TW"
}

describe("CartPanel checkout success flow", () => {
  beforeEach(() => {
    useCartStore.setState({
      items: [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 2 }],
    });
    useSettingsStore.setState({ activePanel: "cart", wooKey: "", wooSecret: "", wpUrl: "https://shop.example.com", wooUseSameUrl: true });
    setWooConnected();
    mockCheckout.mockClear();
    mockCheckout.mockResolvedValue({ id: 100, order_key: "wc_order_test" });
  });

  it("shows clear cart link after successful checkout", async () => {
    const { container } = render(withProviders(<CartPanel />));
    fillAllBillingFields(container);
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
    useSettingsStore.setState({ wooKey: "", wooSecret: "", wpUrl: "" });
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
    fillAllBillingFields(container);
    fireEvent.click(screen.getByText("\u7D50\u5E33"));
    await waitFor(() => {
      // Non-Error rejections now display the i18n generic error message
      expect(screen.getByText(/\u767C\u751F\u975E\u9810\u671F\u932F\u8AA4/)).toBeInTheDocument();
    });
  });

  it("clears validation error when user edits a billing field (regression #95)", () => {
    const { container } = render(withProviders(<CartPanel />));
    fireEvent.click(screen.getByText("\u7D50\u5E33"));
    expect(screen.getByText(/\u8ACB\u586B\u5BEB\u6240\u6709\u5FC5\u586B\u6B04\u4F4D/)).toBeInTheDocument();
    const inputs = container.querySelectorAll<HTMLInputElement>("input");
    fireEvent.change(inputs[0]!, { target: { value: "J" } });
    expect(screen.queryByText(/\u8ACB\u586B\u5BEB\u6240\u6709\u5FC5\u586B\u6B04\u4F4D/)).not.toBeInTheDocument();
  });

  it("clears previous error at start of handleCheckout retry (regression #95)", async () => {
    const { container } = render(withProviders(<CartPanel />));
    fireEvent.click(screen.getByText("\u7D50\u5E33"));
    expect(screen.getByText(/\u8ACB\u586B\u5BEB\u6240\u6709\u5FC5\u586B\u6B04\u4F4D/)).toBeInTheDocument();
    fillAllBillingFields(container);
    fireEvent.click(screen.getByText("\u7D50\u5E33"));
    await waitFor(() => {
      expect(mockCheckout).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByText(/\u8ACB\u586B\u5BEB\u6240\u6709\u5FC5\u586B\u6B04\u4F4D/)).not.toBeInTheDocument();
  });

  it("displays translated AppError message during checkout instead of generic error (regression #460)", async () => {
    // Mock checkout to throw an AppError with a known i18n code
    mockCheckout.mockRejectedValueOnce(
      new AppError("error_price_changed", "Price changed fallback", { details: "Widget: 10 \u2192 15" }),
    );
    const { container } = render(withProviders(<CartPanel />));
    fillAllBillingFields(container);
    fireEvent.click(screen.getByText("\u7D50\u5E33"));
    await waitFor(() => {
      // The error message should contain the translated text for
      // error_price_changed, NOT the generic error_unhandled translation.
      // zh.error_price_changed includes "\u8CFC\u7269\u8ECA\u4E2D\u90E8\u5206\u5546\u54C1\u50F9\u683C\u5DF2\u8B8A\u52D5"
      // zh.error_unhandled is "\u767C\u751F\u975E\u9810\u671F\u7684\u932F\u8AA4"
      const errorEl = container.querySelector(".text-danger");
      expect(errorEl).toBeTruthy();
      // Must NOT show the generic unhandled error
      expect(errorEl!.textContent).not.toContain("\u767C\u751F\u975E\u9810\u671F\u7684\u932F\u8AA4");
      // Must show the translated price_changed message (contains the interpolated details)
      expect(errorEl!.textContent).toContain("Widget: 10 \u2192 15");
    });
  });
});

describe("CartPanel checkout dedup (regression #465)", () => {
  beforeEach(() => {
    useCartStore.setState({
      items: [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 2 }],
    });
    useSettingsStore.setState({ activePanel: "cart", wooKey: "", wooSecret: "", wpUrl: "https://shop.example.com", wooUseSameUrl: true });
    setWooConnected();
    mockCheckout.mockClear();
    mockCheckout.mockResolvedValue({ id: 100, order_key: "wc_order_test" });
  });

  it("checkout sends shipping when shipToBilling is unchecked (regression #465)", async () => {
    const { container } = render(withProviders(<CartPanel />));
    fillAllBillingFields(container);

    // Uncheck the "ship to billing" checkbox (inputs[8] is the checkbox)
    const checkboxes = container.querySelectorAll<HTMLInputElement>("input[type='checkbox']");
    fireEvent.click(checkboxes[0]!);

    // After unchecking, shipping fields appear. Re-query all inputs.
    const allInputs = container.querySelectorAll<HTMLInputElement>("input");
    // Shipping fields start after billing (8 fields) + checkbox (1) = index 9
    // shipping: first_name, last_name, address_1, city, postcode, country
    fireEvent.change(allInputs[9]!, { target: { value: "Jane" } });
    fireEvent.change(allInputs[10]!, { target: { value: "Smith" } });
    fireEvent.change(allInputs[11]!, { target: { value: "456 Oak Ave" } });
    fireEvent.change(allInputs[12]!, { target: { value: "Kaohsiung" } });
    fireEvent.change(allInputs[13]!, { target: { value: "800" } });
    // allInputs[14] = shipping country, defaults to "TW"

    fireEvent.click(screen.getByText("\u7D50\u5E33"));

    await waitFor(() => {
      expect(mockCheckout).toHaveBeenCalledTimes(1);
    });

    const callArgs = mockCheckout.mock.calls[0]![0];
    expect(callArgs).toHaveProperty("shipping");
    expect(callArgs.shipping).toEqual(
      expect.objectContaining({
        first_name: "Jane",
        last_name: "Smith",
        address_1: "456 Oak Ave",
        city: "Kaohsiung",
        postcode: "800",
        country: "TW",
      }),
    );
  });

  it("checkout omits shipping when shipToBilling is checked (regression #465)", async () => {
    const { container } = render(withProviders(<CartPanel />));
    fillAllBillingFields(container);

    // shipToBilling defaults to true, so just submit
    fireEvent.click(screen.getByText("\u7D50\u5E33"));

    await waitFor(() => {
      expect(mockCheckout).toHaveBeenCalledTimes(1);
    });

    const callArgs = mockCheckout.mock.calls[0]![0];
    expect(callArgs).not.toHaveProperty("shipping");
    expect(callArgs).toHaveProperty("items");
    expect(callArgs).toHaveProperty("billing");
  });

  it("checkout error handling is consistent regardless of shipping toggle (regression #465)", async () => {
    const testError = new AppError("error_price_changed", "Price changed", { details: "Widget: 10 \u2192 15" });

    // Test 1: shipToBilling = true (default)
    mockCheckout.mockRejectedValueOnce(testError);
    const { container: c1, unmount: u1 } = render(withProviders(<CartPanel />));
    fillAllBillingFields(c1);
    fireEvent.click(screen.getByText("\u7D50\u5E33"));
    await waitFor(() => {
      const errorEl = c1.querySelector(".text-danger");
      expect(errorEl).toBeTruthy();
      expect(errorEl!.textContent).toContain("Widget: 10 \u2192 15");
    });
    const errorText1 = c1.querySelector(".text-danger")!.textContent;
    u1();

    // Test 2: shipToBilling = false
    mockCheckout.mockClear();
    mockCheckout.mockRejectedValueOnce(testError);
    const { container: c2 } = render(withProviders(<CartPanel />));
    fillAllBillingFields(c2);

    // Uncheck shipToBilling
    const checkboxes = c2.querySelectorAll<HTMLInputElement>("input[type='checkbox']");
    fireEvent.click(checkboxes[0]!);

    // Fill shipping fields
    const allInputs = c2.querySelectorAll<HTMLInputElement>("input");
    fireEvent.change(allInputs[9]!, { target: { value: "Jane" } });
    fireEvent.change(allInputs[10]!, { target: { value: "Smith" } });
    fireEvent.change(allInputs[11]!, { target: { value: "456 Oak Ave" } });
    fireEvent.change(allInputs[12]!, { target: { value: "Kaohsiung" } });
    fireEvent.change(allInputs[13]!, { target: { value: "800" } });

    fireEvent.click(screen.getByText("\u7D50\u5E33"));
    await waitFor(() => {
      const errorEl = c2.querySelector(".text-danger");
      expect(errorEl).toBeTruthy();
      expect(errorEl!.textContent).toContain("Widget: 10 \u2192 15");
    });
    const errorText2 = c2.querySelector(".text-danger")!.textContent;

    // Both paths should produce the exact same error message
    expect(errorText1).toBe(errorText2);
  });
});
