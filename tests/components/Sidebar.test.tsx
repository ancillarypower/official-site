import { describe, it, expect, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/context/I18nContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { useSettingsStore } from "@/stores/settingsStore";

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

describe("Sidebar", () => {
  beforeEach(() => {
    useSettingsStore.setState({ activePanel: null, wooKey: "", wooSecret: "" });
  });

  it("renders overlay and two aside panels", () => {
    const { container } = render(withProviders(<Sidebar />));
    const asides = container.querySelectorAll("aside");
    expect(asides).toHaveLength(2);
  });

  it("closes panel when overlay is clicked", () => {
    useSettingsStore.setState({ activePanel: "settings" });
    const { container } = render(withProviders(<Sidebar />));
    const overlay = container.querySelector(".fixed.inset-0");
    expect(overlay).toBeInTheDocument();
    fireEvent.click(overlay!);
    expect(useSettingsStore.getState().activePanel).toBeNull();
  });

  it("shows settings panel translated when active", () => {
    useSettingsStore.setState({ activePanel: "settings" });
    const { container } = render(withProviders(<Sidebar />));
    const settingsAside = container.querySelector("aside[aria-label='Settings']");
    expect(settingsAside).toBeInTheDocument();
    expect(settingsAside).toHaveAttribute("aria-hidden", "false");
  });

  it("hides settings panel when not active", () => {
    useSettingsStore.setState({ activePanel: null });
    const { container } = render(withProviders(<Sidebar />));
    const settingsAside = container.querySelector("aside[aria-label='Settings']");
    expect(settingsAside).toBeInTheDocument();
    expect(settingsAside).toHaveAttribute("aria-hidden", "true");
  });

  it("shows cart panel when active", () => {
    useSettingsStore.setState({ activePanel: "cart" });
    const { container } = render(withProviders(<Sidebar />));
    const cartAside = container.querySelector("aside[aria-label='Shopping cart']");
    expect(cartAside).toBeInTheDocument();
    expect(cartAside).toHaveAttribute("aria-hidden", "false");
  });

  it("hides cart panel when settings is active", () => {
    useSettingsStore.setState({ activePanel: "settings" });
    const { container } = render(withProviders(<Sidebar />));
    const cartAside = container.querySelector("aside[aria-label='Shopping cart']");
    expect(cartAside).toBeInTheDocument();
    expect(cartAside).toHaveAttribute("aria-hidden", "true");
  });

  it("overlay is visible when panel is active", () => {
    useSettingsStore.setState({ activePanel: "cart" });
    const { container } = render(withProviders(<Sidebar />));
    const overlay = container.querySelector(".fixed.inset-0");
    expect(overlay).toBeInTheDocument();
  });
});
