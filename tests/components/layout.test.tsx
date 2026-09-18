import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/context/I18nContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SkipToContent } from "@/components/layout/SkipToContent";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { useSettingsStore } from "@/stores/settingsStore";
import { useCartStore } from "@/stores/cartStore";
import App from "@/App";

function withProviders(ui: React.ReactElement) {
  return <MemoryRouter><I18nProvider>{ui}</I18nProvider></MemoryRouter>;
}

describe("SkipToContent", () => {
  it("renders a skip link", () => {
    render(<I18nProvider><SkipToContent /></I18nProvider>);
    const link = screen.getByText("跳至主要內容");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "#main-content");
  });
});

describe("Navbar", () => {
  beforeEach(() => {
    useSettingsStore.setState({ activePanel: null, theme: "light" });
    useCartStore.setState({ items: [] });
  });

  it("renders company logo and brand name linking to home", () => {
    render(withProviders(<Navbar />));
    const brandText = screen.getByText("安瑟樂威");
    expect(brandText).toBeInTheDocument();
    const brandLink = brandText.closest("a");
    expect(brandLink).toHaveAttribute("href", "/");
    const logo = brandLink!.querySelector("img");
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("src", expect.stringContaining("logo.svg"));
  });

  it("renders navigation with links", () => {
    render(withProviders(<Navbar />));
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByText("消息")).toBeInTheDocument();
    expect(screen.getByText("3D 模型")).toBeInTheDocument();
    expect(screen.getByText("商店")).toBeInTheDocument();
    expect(screen.getByText("關於我們")).toBeInTheDocument();
  });

  it("renders settings and cart buttons", () => {
    render(withProviders(<Navbar />));
    expect(screen.getByLabelText("設定")).toBeInTheDocument();
    expect(screen.getByLabelText("購物車")).toBeInTheDocument();
  });

  it("renders language toggle button", () => {
    render(withProviders(<Navbar />));
    expect(screen.getByLabelText("切換語言")).toBeInTheDocument();
  });

  it("opens settings panel when settings button is clicked", () => {
    render(withProviders(<Navbar />));
    fireEvent.click(screen.getByLabelText("設定"));
    expect(useSettingsStore.getState().activePanel).toBe("settings");
  });

  it("opens cart panel when cart button is clicked", () => {
    render(withProviders(<Navbar />));
    fireEvent.click(screen.getByLabelText("購物車"));
    expect(useSettingsStore.getState().activePanel).toBe("cart");
  });

  it("cycles theme when theme button is clicked", () => {
    render(withProviders(<Navbar />));
    const themeButton = screen.getByText("☀").closest("button")!;
    fireEvent.click(themeButton);
    expect(useSettingsStore.getState().theme).toBe("sepia");
  });

  it("toggles language when language button is clicked", () => {
    render(withProviders(<Navbar />));
    const langButton = screen.getByLabelText("切換語言");
    expect(langButton).toHaveTextContent("EN");
    fireEvent.click(langButton);
    expect(langButton).toHaveTextContent("中文");
  });

  it("displays cart item count in badge", () => {
    useCartStore.setState({
      items: [
        { id: 1, name: "A", price: 10, icon: null, img: null, qty: 3 },
        { id: 2, name: "B", price: 20, icon: null, img: null, qty: 2 },
      ],
    });
    render(withProviders(<Navbar />));
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows sepia theme icon", () => {
    useSettingsStore.setState({ theme: "sepia" });
    render(withProviders(<Navbar />));
    expect(screen.getByText("\uD83D\uDCDC")).toBeInTheDocument();
  });

  it("shows dark theme icon", () => {
    useSettingsStore.setState({ theme: "dark" });
    render(withProviders(<Navbar />));
    expect(screen.getByText("\uD83C\uDF19")).toBeInTheDocument();
  });
});

describe("Footer", () => {
  it("renders copyright text", () => {
    render(withProviders(<Footer />));
    expect(screen.getByText(/\u00A9 2026 \u5b89\u745f\u6a02\u5a01/)).toBeInTheDocument();
  });

  it("renders company website link", () => {
    render(withProviders(<Footer />));
    const websiteLink = screen.getByText("官方網站");
    expect(websiteLink).toHaveAttribute("href", "https://www.ancillarypower.com");
  });

  it("renders contact email link", () => {
    render(withProviders(<Footer />));
    const emailLink = screen.getByText("contact@ancillarypower.com");
    expect(emailLink).toHaveAttribute("href", "mailto:contact@ancillarypower.com");
  });

  it("does not render developer documentation links", () => {
    render(withProviders(<Footer />));
    expect(screen.queryByText("WooCommerce API")).not.toBeInTheDocument();
    expect(screen.queryByText("Three.js")).not.toBeInTheDocument();
  });
});

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(<ErrorBoundary><div>Child content</div></ErrorBoundary>);
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("renders fallback UI on error", () => {
    function Bomb(): JSX.Element { throw new Error("Boom!"); }
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorBoundary><Bomb /></ErrorBoundary>);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.queryByText("Boom!")).not.toBeInTheDocument();
    expect(screen.getByText(/unexpected error/i)).toBeInTheDocument();
    expect(screen.getByText("Reload Page")).toBeInTheDocument();
    spy.mockRestore();
  });
});

describe("App scalable-content structure", () => {
  it("wraps HeroBanner and Footer inside #scalable-content but not Navbar", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <I18nProvider>
            <App />
          </I18nProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
    const scalable = container.querySelector("#scalable-content");
    expect(scalable).toBeInTheDocument();
    expect(scalable!.querySelector("#main-content")).toBeInTheDocument();
    expect(scalable!.querySelector("footer")).toBeInTheDocument();
    expect(scalable!.querySelector("canvas")).toBeInTheDocument();
    const nav = container.querySelector("nav");
    expect(nav).toBeInTheDocument();
    expect(scalable!.contains(nav!)).toBe(false);
  });
});
