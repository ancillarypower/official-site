import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/context/I18nContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SkipToContent } from "@/components/layout/SkipToContent";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";

function withProviders(ui: React.ReactElement) {
  return <MemoryRouter><I18nProvider>{ui}</I18nProvider></MemoryRouter>;
}

describe("SkipToContent", () => {
  it("renders a skip link", () => {
    render(<SkipToContent />);
    const link = screen.getByText("Skip to content");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "#main-content");
  });
});

describe("Navbar", () => {
  it("renders navigation with links", () => {
    render(withProviders(<Navbar />));
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByText("內容")).toBeInTheDocument();
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
    expect(screen.getByLabelText("Toggle language")).toBeInTheDocument();
  });
});

describe("Footer", () => {
  it("renders footer text", () => {
    render(withProviders(<Footer />));
    expect(screen.getByText("WP 內容 + 3D 檢視器 + WooCommerce 商店")).toBeInTheDocument();
  });

  it("renders external links", () => {
    render(withProviders(<Footer />));
    expect(screen.getByText("WooCommerce API")).toHaveAttribute("href", expect.stringContaining("woocommerce"));
    expect(screen.getByText("Three.js")).toHaveAttribute("href", expect.stringContaining("threejs"));
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
    expect(screen.getByText("Boom!")).toBeInTheDocument();
    expect(screen.getByText("Reload Page")).toBeInTheDocument();
    spy.mockRestore();
  });
});
