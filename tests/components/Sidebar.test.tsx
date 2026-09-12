import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/context/I18nContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { useSettingsStore } from "@/stores/settingsStore";

function renderSidebar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <I18nProvider>
          <Sidebar />
        </I18nProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Sidebar", () => {
  beforeEach(() => {
    useSettingsStore.setState({ activePanel: null });
  });

  it("renders settings and cart dialogs", () => {
    renderSidebar();
    const dialogs = screen.getAllByRole("dialog", { hidden: true });
    expect(dialogs.length).toBeGreaterThanOrEqual(2);
  });

  it("hides both panels by default", () => {
    renderSidebar();
    const dialogs = screen.getAllByRole("dialog", { hidden: true });
    for (const d of dialogs) {
      expect(d).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("shows settings panel when activePanel is settings", () => {
    useSettingsStore.setState({ activePanel: "settings" });
    renderSidebar();
    const settings = screen.getByRole("dialog", { name: "Settings", hidden: true });
    expect(settings).toHaveAttribute("aria-hidden", "false");
  });

  it("shows cart panel when activePanel is cart", () => {
    useSettingsStore.setState({ activePanel: "cart" });
    renderSidebar();
    const cart = screen.getByRole("dialog", { name: "Shopping cart", hidden: true });
    expect(cart).toHaveAttribute("aria-hidden", "false");
  });

  it("keeps other panel hidden when one is open", () => {
    useSettingsStore.setState({ activePanel: "settings" });
    renderSidebar();
    const cart = screen.getByRole("dialog", { name: "Shopping cart", hidden: true });
    expect(cart).toHaveAttribute("aria-hidden", "true");
  });
});
