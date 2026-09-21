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
  fireEvent.change(inputs[0]!, { target: { value: "John" } });      // first_name
  fireEvent.change(inputs[1]!, { target: { value: "Doe" } });       // last_name
  fireEvent.change(inputs[2]!, { target: { value: "john@example.com" } }); // email
  fireEvent.change(inputs[3]!, { target: { value: "0912345678" } }); // phone
  fireEvent.change(inputs[4]!, { target: { value: "123 Main St" } }); // address_1
  fireEvent.change(inputs[5]!, { target: { value: "Taipei" } });     // city
  fireEvent.change(inputs[6]!, { target: { value: "100" } });        // postcode
  // inputs[7] = country, already defaults to "TW"
}

/**
 * Helper: replace window.location with a minimal mock that has a spyable
 * assign(). jsdom's Location object is non-configurable, so vi.spyOn on
 * location.assign throws TypeError. Returns { assignMock, restore }.
 */
function mockLocationAssign() {
  const assignMock = vi.fn();
  const savedLocation = window.location;
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { assign: assignMock, href: savedLocation.href, origin: savedLocation.origin },
  });
  return {
    assignMock,
    restore: () => {
      Object.defineProperty(window, "location", {
        configurable: true,
        writable: true,
        value: savedLocation,
      });
    },
  };
}

describe("CartPanel", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
    useSettingsStore.setState({
      activePanel: "cart",
      wooKey: "",
      wooSecret: "",
      wpUrl: "https://shop.example.com",
      wooUseSameUrl: true,
    });
    mockCheckout.mockClear();
  });

  it("shows empty cart message", () => {
    render(withProviders(<CartPanel />));
    expect(screen.getByText(/購物車是空的/)).toBeInTheDocument();
  });

  it("renders cart title", () => {
    render(withProviders(<CartPanel />));
    expect(screen.getByText("購物車")).toBeInTheDocument();
  });

  it("renders items with quantity controls", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "Headphones", price: 99.99, icon: "🎧", img: null, qty: 2 }],
    });
    render(withProviders(<CartPanel />));
    expect(screen.getByText("Headphones")).toBeInTheDocument();
    expect(screen.getByText("NT$99.99")).toBeInTheDocument();
    expect(screen.getByLabelText("減少數量")).toBeInTheDocument();
    expect(screen.getByLabelText("增加數量")).toBeInTheDocument();
  });

  it("displays total price", () => {
    useCartStore.setState({
      items: [
        { id: 1, name: "A", price: 10, icon: null, img: null, qty: 2 },
        { id: 2, name: "B", price: 20, icon: null, img: null, qty: 1 },
      ],
    });
    render(withProviders(<CartPanel />));
    expect(screen.getByText("NT$40.00")).toBeInTheDocument();
  });

  it("disables checkout without WooCommerce", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "A", price: 10, icon: null, img: null, qty: 1 }],
    });
    render(withProviders(<CartPanel />));
    expect(screen.getByText("結帳")).toBeDisabled();
  });

  it("does not show clear all button when cart is empty", () => {
    render(withProviders(<CartPanel />));
    expect(screen.queryByLabelText(/清空購物車/)).not.toBeInTheDocument();
  });

  it("shows clear all button when cart has items", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "A", price: 10, icon: null, img: null, qty: 1 }],
    });
    render(withProviders(<CartPanel />));
    expect(screen.getByLabelText(/清空購物車/)).toBeInTheDocument();
  });

  it("clears cart when clear all is confirmed", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "A", price: 10, icon: null, img: null, qty: 1 }],
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(withProviders(<CartPanel />));
    fireEvent.click(screen.getByLabelText(/清空購物車/));
    expect(useCartStore.getState().items).toHaveLength(0);
    vi.restoreAllMocks();
  });

  it("keeps items when clear all is cancelled", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "A", price: 10, icon: null, img: null, qty: 1 }],
    });
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(withProviders(<CartPanel />));
    fireEvent.click(screen.getByLabelText(/清空購物車/));
    expect(useCartStore.getState().items).toHaveLength(1);
    vi.restoreAllMocks();
  });

  it("increases item quantity when increase button is clicked", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "Headphones", price: 99.99, icon: "🎧", img: null, qty: 1 }],
    });
    render(withProviders(<CartPanel />));
    fireEvent.click(screen.getByLabelText("增加數量"));
    expect(useCartStore.getState().items[0]?.qty).toBe(2);
  });

  it("removes item when quantity reaches zero via decrease", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "Headphones", price: 99.99, icon: "🎧", img: null, qty: 1 }],
    });
    render(withProviders(<CartPanel />));
    fireEvent.click(screen.getByLabelText("減少數量"));
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
    expect(screen.getByText("📦")).toBeInTheDocument();
  });

  it("enables checkout when WooCommerce is connected", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "A", price: 10, icon: null, img: null, qty: 1 }],
    });
    setWooConnected();
    render(withProviders(<CartPanel />));
    expect(screen.getByText("結帳")).not.toBeDisabled();
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
    setWooConnected();
    render(withProviders(<CartPanel />));
    expect(() => {
      fireEvent.click(screen.getByText("結帳"));
    }).not.toThrow();
  });

  /* ── Issue #44 Regression Tests ── */

  it("calls checkout mutation with items and billing on valid checkout", async () => {
    useCartStore.setState({
      items: [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 2 }],
    });
    setWooConnected();
    const { container } = render(withProviders(<CartPanel />));

    fillAllBillingFields(container);

    fireEvent.click(screen.getByText("結帳"));

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
    setWooConnected();
    const { container } = render(withProviders(<CartPanel />));

    fillAllBillingFields(container);

    fireEvent.click(screen.getByText("結帳"));

    await waitFor(() => {
      expect(screen.getByText("Payment gateway unavailable")).toBeInTheDocument();
    });
  });

  it("does not call checkout when required billing fields are empty", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 1 }],
    });
    setWooConnected();
    render(withProviders(<CartPanel />));

    fireEvent.click(screen.getByText("結帳"));

    expect(mockCheckout).not.toHaveBeenCalled();
  });

  /* ── Issue #75 Regression Test ── */

  it("shows field validation error instead of WooCommerce error when billing is incomplete", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 1 }],
    });
    setWooConnected();
    render(withProviders(<CartPanel />));

    fireEvent.click(screen.getByText("結帳"));

    expect(screen.getByText(/請填寫所有必填欄位/)).toBeInTheDocument();
    expect(screen.queryByText(/請先連接 WooCommerce/)).not.toBeInTheDocument();
  });

  /* ── Issue #104 Regression Test ── */

  it("all checkout inputs have name and autocomplete attributes", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "A", price: 10, icon: null, img: null, qty: 1 }],
    });
    const { container } = render(withProviders(<CartPanel />));

    const expected: Array<{ name: string; autocomplete: string }> = [
      { name: "given-name", autocomplete: "given-name" },
      { name: "family-name", autocomplete: "family-name" },
      { name: "email", autocomplete: "email" },
      { name: "tel", autocomplete: "tel" },
      { name: "street-address", autocomplete: "street-address" },
      { name: "address-level2", autocomplete: "address-level2" },
      { name: "postal-code", autocomplete: "postal-code" },
      { name: "country", autocomplete: "country" },
    ];

    const inputs = container.querySelectorAll<HTMLInputElement>("input");
    expect(inputs.length).toBe(expected.length);

    expected.forEach((spec, i) => {
      expect(inputs[i]).toHaveAttribute("name", spec.name);
      expect(inputs[i]).toHaveAttribute("autocomplete", spec.autocomplete);
    });

    // phone input should also have type="tel"
    const phoneInput = container.querySelector<HTMLInputElement>("input[name='tel']");
    expect(phoneInput).toHaveAttribute("type", "tel");
  });

  /* ── Issue #135 Regression Tests ── */

  it("all billing inputs have visible labels via label elements (regression #135)", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "A", price: 10, icon: null, img: null, qty: 1 }],
    });
    const { container } = render(withProviders(<CartPanel />));

    const expectedLabels = [
      "名字",
      "姓氏",
      "Email",
      "電話",
      "地址",
      "城市",
      "郵遞區號",
      "國家代碼",
    ];

    const labels = container.querySelectorAll<HTMLLabelElement>("label");
    expect(labels.length).toBe(expectedLabels.length);

    expectedLabels.forEach((text, i) => {
      const span = labels[i]!.querySelector("span");
      expect(span).not.toBeNull();
      expect(span!.textContent).toBe(text);
      expect(labels[i]!.querySelector("input")).not.toBeNull();
    });
  });

  it("screen reader can identify billing inputs by label (regression #135)", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "A", price: 10, icon: null, img: null, qty: 1 }],
    });
    render(withProviders(<CartPanel />));

    const fieldLabels = [
      "名字",
      "姓氏",
      "Email",
      "電話",
      "地址",
      "城市",
      "郵遞區號",
      "國家代碼",
    ];

    fieldLabels.forEach((label) => {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    });
  });

  /* ── Issue #137 Regression Test ── */

  it("disables checkout when wooSecret is empty but wooKey is set (regression #137)", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "A", price: 10, icon: null, img: null, qty: 1 }],
    });
    useSettingsStore.setState({ wooKey: "ck_test", wooSecret: "" });
    render(withProviders(<CartPanel />));
    expect(screen.getByText("結帳")).toBeDisabled();
  });

  /* ── Issue #133 Regression Test ── */

  it("error message uses semantic danger tokens instead of hardcoded oklch (regression #133)", async () => {
    mockCheckout.mockRejectedValueOnce(new Error("Test error"));
    useCartStore.setState({
      items: [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 1 }],
    });
    setWooConnected();
    const { container } = render(withProviders(<CartPanel />));

    fillAllBillingFields(container);

    fireEvent.click(screen.getByText("結帳"));

    await waitFor(() => {
      expect(screen.getByText("Test error")).toBeInTheDocument();
    });

    const errorDiv = screen.getByText("Test error");
    expect(errorDiv.className).toContain("border-danger/20");
    expect(errorDiv.className).toContain("bg-danger/5");
    expect(errorDiv.className).toContain("text-danger");
    expect(errorDiv.className).not.toContain("oklch");
  });

  /* ── Issue #147 Regression Tests ── */

  it("blocks checkout when phone/address/city/postcode are empty (regression #147)", () => {
    useCartStore.setState({
      items: [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 1 }],
    });
    setWooConnected();
    const { container } = render(withProviders(<CartPanel />));

    // Fill only first_name, last_name, email (old 3-field validation would pass)
    const inputs = container.querySelectorAll<HTMLInputElement>("input");
    fireEvent.change(inputs[0]!, { target: { value: "John" } });
    fireEvent.change(inputs[1]!, { target: { value: "Doe" } });
    fireEvent.change(inputs[2]!, { target: { value: "john@example.com" } });

    fireEvent.click(screen.getByText("結帳"));

    expect(mockCheckout).not.toHaveBeenCalled();
    expect(screen.getByText(/請填寫所有必填欄位/)).toBeInTheDocument();
  });

  it("proceeds to checkout when all 8 required fields are filled (regression #147)", async () => {
    useCartStore.setState({
      items: [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 1 }],
    });
    setWooConnected();
    const { container } = render(withProviders(<CartPanel />));

    fillAllBillingFields(container);
    fireEvent.click(screen.getByText("結帳"));

    await waitFor(() => {
      expect(mockCheckout).toHaveBeenCalledTimes(1);
    });
  });

  /* ── Issue #241 Regression Tests ── */

  it("redirects to payment_url after successful checkout (regression #241)", async () => {
    mockCheckout.mockResolvedValueOnce({
      id: 100,
      order_key: "wc_order_test",
      payment_url: "https://shop.example.com/checkout/order-pay/100/?key=wc_order_test",
    });
    useCartStore.setState({
      items: [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 1 }],
    });
    setWooConnected();

    // jsdom Location is non-configurable; replace window.location entirely
    const { assignMock, restore } = mockLocationAssign();
    const { container } = render(withProviders(<CartPanel />));

    fillAllBillingFields(container);
    fireEvent.click(screen.getByText("結帳"));

    await waitFor(() => {
      expect(assignMock).toHaveBeenCalledWith(
        "https://shop.example.com/checkout/order-pay/100/?key=wc_order_test",
      );
    });
    restore();
  });

  it("shows success state when checkout returns no payment_url (regression #241)", async () => {
    mockCheckout.mockResolvedValueOnce({
      id: 200,
      order_key: "wc_order_no_pay",
    });
    useCartStore.setState({
      items: [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 1 }],
    });
    setWooConnected();

    const { assignMock, restore } = mockLocationAssign();
    const { container } = render(withProviders(<CartPanel />));

    fillAllBillingFields(container);
    fireEvent.click(screen.getByText("結帳"));

    await waitFor(() => {
      expect(mockCheckout).toHaveBeenCalledTimes(1);
    });
    expect(assignMock).not.toHaveBeenCalled();
    restore();
  });

  /* ── Issue #242 Regression Tests ── */

  it("disables checkout button after successful checkout (regression #242)", async () => {
    mockCheckout.mockResolvedValueOnce({
      id: 300,
      order_key: "wc_order_no_pay_242",
    });
    useCartStore.setState({
      items: [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 1 }],
    });
    setWooConnected();
    const { container } = render(withProviders(<CartPanel />));

    fillAllBillingFields(container);

    const checkoutBtn = screen.getByText("結帳");
    expect(checkoutBtn).not.toBeDisabled();

    fireEvent.click(checkoutBtn);

    await waitFor(() => {
      expect(mockCheckout).toHaveBeenCalledTimes(1);
    });

    // After successful checkout the cart is cleared, so the empty-cart view
    // replaces the form. The checkout button should no longer exist.
    await waitFor(() => {
      expect(screen.queryByText("結帳")).not.toBeInTheDocument();
    });
  });

  it("clears cart automatically after successful checkout (regression #242)", async () => {
    mockCheckout.mockResolvedValueOnce({
      id: 301,
      order_key: "wc_order_auto_clear",
    });
    useCartStore.setState({
      items: [{ id: 1, name: "Widget", price: 10, icon: null, img: null, qty: 1 }],
    });
    setWooConnected();
    const { container } = render(withProviders(<CartPanel />));

    fillAllBillingFields(container);
    fireEvent.click(screen.getByText("結帳"));

    await waitFor(() => {
      expect(mockCheckout).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });
});
