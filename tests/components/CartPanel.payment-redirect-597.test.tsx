import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/context/I18nContext";
import { CartPanel } from "@/components/store/CartPanel";
import { useCartStore } from "@/stores/cartStore";
import { useSettingsStore } from "@/stores/settingsStore";

const { mockCheckout } = vi.hoisted(() => ({
  mockCheckout: vi.fn(),
}));
vi.mock("@/hooks/useWooCommerce", () => ({
  useCheckout: () => ({
    mutateAsync: mockCheckout,
    isPending: false,
  }),
}));

const PAY_URL = "https://shop.example.com/checkout/order-pay/100/?key=wc_order_test";

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

/**
 * jsdom's Location is non-configurable, so replace window.location with a
 * minimal object whose assign() is a spy. The spy records how many cart
 * items exist at the exact moment of the redirect.
 */
let savedLocation: Location;
let itemsAtRedirect: number | null;
let assignMock: ReturnType<typeof vi.fn>;

function mockLocationAssign() {
  savedLocation = window.location;
  itemsAtRedirect = null;
  assignMock = vi.fn(() => {
    itemsAtRedirect = useCartStore.getState().items.length;
  });
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { assign: assignMock, href: savedLocation.href, origin: savedLocation.origin },
  });
}

function submitCheckout(container: HTMLElement) {
  fillAllBillingFields(container);
  fireEvent.click(screen.getByText("\u7D50\u5E33"));
}

describe("CartPanel clears cart before redirecting to payment_url (regression #597)", () => {
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
    mockCheckout.mockResolvedValue({ id: 100, order_key: "wc_order_test", payment_url: PAY_URL });
    mockLocationAssign();
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: savedLocation,
    });
  });

  it("redirects to a valid https payment_url and leaves the cart empty", async () => {
    const { container } = render(withProviders(<CartPanel />));
    submitCheckout(container);
    await waitFor(() => {
      expect(assignMock).toHaveBeenCalledWith(PAY_URL);
    });
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("clears the cart before the redirect happens, not after", async () => {
    const { container } = render(withProviders(<CartPanel />));
    submitCheckout(container);
    await waitFor(() => {
      expect(assignMock).toHaveBeenCalledTimes(1);
    });
    expect(itemsAtRedirect).toBe(0);
  });

  it("persists the empty cart so going back to the site does not restore it", async () => {
    const { container } = render(withProviders(<CartPanel />));
    submitCheckout(container);
    await waitFor(() => {
      expect(assignMock).toHaveBeenCalledTimes(1);
    });
    const raw = window.localStorage.getItem("ap-cart");
    expect(raw).not.toBeNull();
    const persisted = JSON.parse(raw!) as { state: { items: unknown[] } };
    expect(persisted.state.items).toEqual([]);
  });

  it("keeps the cart when checkout fails before the order exists", async () => {
    mockCheckout.mockReset();
    mockCheckout.mockRejectedValueOnce(new Error("Payment gateway unavailable"));
    const { container } = render(withProviders(<CartPanel />));
    submitCheckout(container);
    await waitFor(() => {
      expect(screen.getByText("Payment gateway unavailable")).toBeInTheDocument();
    });
    expect(assignMock).not.toHaveBeenCalled();
    expect(useCartStore.getState().items).toHaveLength(1);
  });
});
