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
      const errorEl = container.querySelector(".text-danger");
      expect(errorEl).toBeTruthy();
      expect(errorEl!.textContent).not.toContain("\u767C\u751F\u975E\u9810\u671F\u7684\u932F\u8AA4");
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
    const checkboxes = container.querySelectorAll<HTMLInputElement>("input[type='checkbox']");
    fireEvent.click(checkboxes[0]!);
    const allInputs = container.querySelectorAll<HTMLInputElement>("input");
    fireEvent.change(allInputs[9]!, { target: { value: "Jane" } });
    fireEvent.change(allInputs[10]!, { target: { value: "Smith" } });
    fireEvent.change(allInputs[11]!, { target: { value: "456 Oak Ave" } });
    fireEvent.change(allInputs[12]!, { target: { value: "Kaohsiung" } });
    fireEvent.change(allInputs[13]!, { target: { value: "800" } });
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
    mockCheckout.mockClear();
    mockCheckout.mockRejectedValueOnce(testError);
    const { container: c2 } = render(withProviders(<CartPanel />));
    fillAllBillingFields(c2);
    const checkboxes = c2.querySelectorAll<HTMLInputElement>("input[type='checkbox']");
    fireEvent.click(checkboxes[0]!);
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
    expect(errorText1).toBe(errorText2);
  });
});

describe("CartPanel form element (regression #545)", () => {
  beforeEach(() => {
    useCartStore.setState({
      items: [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 2 }],
    });
    useSettingsStore.setState({ activePanel: "cart", wooKey: "", wooSecret: "", wpUrl: "https://shop.example.com", wooUseSameUrl: true });
    setWooConnected();
  });

  it("billing inputs are inside a form element and checkout button is type submit (regression #545)", () => {
    const { container } = render(withProviders(<CartPanel />));
    const form = container.querySelector("form");
    expect(form).toBeTruthy();
    const formInputs = form!.querySelectorAll("input");
    expect(formInputs.length).toBeGreaterThanOrEqual(8);
    const submitBtn = form!.querySelector("button[type='submit']");
    expect(submitBtn).toBeTruthy();
    expect(submitBtn!.textContent).toContain("\u7D50\u5E33");
  });
});

describe("CartPanel ISO 3166-1 country validation (regression #553)", () => {
  beforeEach(() => {
    useCartStore.setState({
      items: [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 2 }],
    });
    useSettingsStore.setState({ activePanel: "cart", wooKey: "", wooSecret: "", wpUrl: "https://shop.example.com", wooUseSameUrl: true });
    setWooConnected();
    mockCheckout.mockClear();
    mockCheckout.mockResolvedValue({ id: 100, order_key: "wc_order_test" });
  });

  it("rejects invalid ISO 3166-1 country code at billing validation (regression #553)", async () => {
    const { container } = render(withProviders(<CartPanel />));
    fillAllBillingFields(container);
    const inputs = container.querySelectorAll<HTMLInputElement>("input");
    fireEvent.change(inputs[7]!, { target: { value: "ZZ" } });
    fireEvent.click(screen.getByText("\u7D50\u5E33"));
    expect(mockCheckout).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText(/\u8ACB\u586B\u5BEB\u6240\u6709\u5FC5\u586B\u6B04\u4F4D/)).toBeInTheDocument();
    });
  });
});

describe("CartPanel payment_url protocol validation (regression #578)", () => {
  beforeEach(() => {
    useCartStore.setState({
      items: [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 2 }],
    });
    useSettingsStore.setState({ activePanel: "cart", wooKey: "", wooSecret: "", wpUrl: "https://shop.example.com", wooUseSameUrl: true });
    setWooConnected();
    mockCheckout.mockClear();
  });

  it("blocks javascript: payment_url (regression #578)", async () => {
    mockCheckout.mockResolvedValueOnce({ id: 100, payment_url: "javascript:alert(1)" });
    const { container } = render(withProviders(<CartPanel />));
    fillAllBillingFields(container);
    fireEvent.click(screen.getByText("\u7D50\u5E33"));
    await waitFor(() => {
      expect(mockCheckout).toHaveBeenCalledTimes(1);
    });
    // Error message should be displayed for unsafe protocol
    await waitFor(() => {
      const errorEl = container.querySelector(".text-danger");
      expect(errorEl).toBeTruthy();
      // zh.error_invalid_payment_url: "\u4ED8\u6B3E\u7DB2\u5740\u7121\u6548\u6216\u4E0D\u5B89\u5168"
      expect(errorEl!.textContent).toContain("\u4ED8\u6B3E\u7DB2\u5740");
    });
  });

  it("blocks http: payment_url (regression #578)", async () => {
    mockCheckout.mockResolvedValueOnce({ id: 100, payment_url: "http://evil.example.com/pay" });
    const { container } = render(withProviders(<CartPanel />));
    fillAllBillingFields(container);
    fireEvent.click(screen.getByText("\u7D50\u5E33"));
    await waitFor(() => {
      expect(mockCheckout).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      const errorEl = container.querySelector(".text-danger");
      expect(errorEl).toBeTruthy();
      expect(errorEl!.textContent).toContain("\u4ED8\u6B3E\u7DB2\u5740");
    });
  });

  it("allows valid https: payment_url (regression #578)", async () => {
    mockCheckout.mockResolvedValueOnce({ id: 100, payment_url: "https://shop.example.com/checkout/order-pay/100" });
    const { container } = render(withProviders(<CartPanel />));
    fillAllBillingFields(container);
    fireEvent.click(screen.getByText("\u7D50\u5E33"));
    await waitFor(() => {
      expect(mockCheckout).toHaveBeenCalledTimes(1);
    });
    // For valid https URL, no error message should be displayed.
    // window.location.assign is a no-op in jsdom, so the component stays
    // rendered but does not enter error or success state.
    await waitFor(() => {
      const errorEl = container.querySelector(".text-danger");
      expect(errorEl).toBeFalsy();
    });
    // Should NOT show success state either (redirect would navigate away)
    expect(screen.queryByText(/\u2713/)).not.toBeInTheDocument();
  });
});

describe("CartPanel clears cart once the order exists on the server (regression #582)", () => {
  beforeEach(() => {
    useCartStore.setState({
      items: [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 2 }],
    });
    useSettingsStore.setState({ activePanel: "cart", wooKey: "", wooSecret: "", wpUrl: "https://shop.example.com", wooUseSameUrl: true });
    setWooConnected();
    mockCheckout.mockClear();
  });

  it("clears cart and keeps the error visible when the order response fails validation (regression #582)", async () => {
    // useCheckout only throws error_order_response_invalid after POST /orders
    // returned 2xx, so the order already exists on WooCommerce.
    mockCheckout.mockRejectedValueOnce(
      new AppError("error_order_response_invalid", "Invalid order response from WooCommerce"),
    );
    const { container } = render(withProviders(<CartPanel />));
    fillAllBillingFields(container);
    fireEvent.click(screen.getByText("\u7D50\u5E33"));
    await waitFor(() => {
      expect(useCartStore.getState().items).toHaveLength(0);
    });
    // zh.error_order_response_invalid: "\u8A02\u55AE\u56DE\u61C9\u683C\u5F0F\u7570\u5E38\uFF0C\u8ACB\u806F\u7E6B\u5BA2\u670D\u78BA\u8A8D\u8A02\u55AE\u72C0\u614B"
    const alertEl = container.querySelector("[role='alert']");
    expect(alertEl).toBeTruthy();
    expect(alertEl!.textContent).toContain("\u8A02\u55AE\u56DE\u61C9\u683C\u5F0F\u7570\u5E38");
    // Checkout form is gone, so the user cannot resubmit the same order
    expect(container.querySelector("form")).toBeNull();
  });

  it("clears cart and keeps the error visible when payment_url is unsafe (regression #582)", async () => {
    mockCheckout.mockResolvedValueOnce({ id: 100, payment_url: "http://evil.example.com/pay" });
    const { container } = render(withProviders(<CartPanel />));
    fillAllBillingFields(container);
    fireEvent.click(screen.getByText("\u7D50\u5E33"));
    await waitFor(() => {
      expect(useCartStore.getState().items).toHaveLength(0);
    });
    const alertEl = container.querySelector("[role='alert']");
    expect(alertEl).toBeTruthy();
    expect(alertEl!.textContent).toContain("\u4ED8\u6B3E\u7DB2\u5740");
    expect(container.querySelector("form")).toBeNull();
  });

  it("keeps cart when checkout fails before the order is created (regression #582)", async () => {
    mockCheckout.mockRejectedValueOnce(
      new AppError("error_price_changed", "Price changed", { details: "Widget: 10 \u2192 15" }),
    );
    const { container } = render(withProviders(<CartPanel />));
    fillAllBillingFields(container);
    fireEvent.click(screen.getByText("\u7D50\u5E33"));
    await waitFor(() => {
      const errorEl = container.querySelector(".text-danger");
      expect(errorEl).toBeTruthy();
      expect(errorEl!.textContent).toContain("Widget: 10 \u2192 15");
    });
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(container.querySelector("form")).toBeTruthy();
  });

  it("does not show a stale checkout error after the user clears the cart manually (regression #582)", async () => {
    mockCheckout.mockRejectedValueOnce(
      new AppError("error_price_changed", "Price changed", { details: "Widget: 10 \u2192 15" }),
    );
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { container } = render(withProviders(<CartPanel />));
    fillAllBillingFields(container);
    fireEvent.click(screen.getByText("\u7D50\u5E33"));
    await waitFor(() => {
      expect(container.querySelector(".text-danger")).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: "\u6E05\u7A7A\u8CFC\u7269\u8ECA" }));
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(container.querySelector("[role='alert']")).toBeNull();
    confirmSpy.mockRestore();
  });
});
