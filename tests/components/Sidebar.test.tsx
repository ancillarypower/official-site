import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/context/I18nContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { useSettingsStore } from "@/stores/settingsStore";

function withProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter><I18nProvider>{ui}</I18nProvider></MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Sidebar", () => {
  beforeEach(() => {
    useSettingsStore.setState({ activePanel: null, wooKey: "", wooSecret: "" });
  });

  it("renders overlay", () => {
    const { container } = render(withProviders(<Sidebar />));
    const overlay = container.querySelector(".fixed.inset-0");
    expect(overlay).toBeInTheDocument();
  });

  it("closes panel when overlay is clicked", () => {
    useSettingsStore.setState({ activePanel: "settings" });
    const { container } = render(withProviders(<Sidebar />));
    const overlay = container.querySelector(".fixed.inset-0");
    fireEvent.click(overlay!);
    expect(useSettingsStore.getState().activePanel).toBeNull();
  });

  it("renders settings dialog", () => {
    useSettingsStore.setState({ activePanel: "settings" });
    render(withProviders(<Sidebar />));
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
  });

  it("renders cart dialog", () => {
    useSettingsStore.setState({ activePanel: "cart" });
    render(withProviders(<Sidebar />));
    expect(screen.getByRole("dialog", { name: "Shopping cart" })).toBeInTheDocument();
  });

  it("marks settings as hidden when cart is active", () => {
    useSettingsStore.setState({ activePanel: "cart" });
    render(withProviders(<Sidebar />));
    const settingsDialog = screen.getByRole("dialog", { name: "Settings", hidden: true });
    expect(settingsDialog).toHaveAttribute("aria-hidden", "true");
  });

  it("marks cart as hidden when settings is active", () => {
    useSettingsStore.setState({ activePanel: "settings" });
    render(withProviders(<Sidebar />));
    const cartDialog = screen.getByRole("dialog", { name: "Shopping cart", hidden: true });
    expect(cartDialog).toHaveAttribute("aria-hidden", "true");
  });
});
