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

  it("renders settings dialog", () => {
    renderSidebar();
    expect(
      screen.getByRole("dialog", { name: "Settings", hidden: true }),
    ).toBeInTheDocument();
  });

  it("renders cart dialog", () => {
    renderSidebar();
    expect(
      screen.getByRole("dialog", { name: "Shopping cart", hidden: true }),
    ).toBeInTheDocument();
  });

  it("hides both panels by default", () => {
    renderSidebar();
    expect(
      screen.getByRole("dialog", { name: "Settings", hidden: true }),
    ).toHaveAttribute("aria-hidden", "true");
    expect(
      screen.getByRole("dialog", { name: "Shopping cart", hidden: true }),
    ).toHaveAttribute("aria-hidden", "true");
  });

  it("shows settings panel when store activePanel is settings", () => {
    useSettingsStore.setState({ activePanel: "settings" });
    renderSidebar();
    expect(
      screen.getByRole("dialog", { name: "Settings", hidden: true }),
    ).toHaveAttribute("aria-hidden", "false");
    expect(
      screen.getByRole("dialog", { name: "Shopping cart", hidden: true }),
    ).toHaveAttribute("aria-hidden", "true");
  });

  it("shows cart panel when store activePanel is cart", () => {
    useSettingsStore.setState({ activePanel: "cart" });
    renderSidebar();
    expect(
      screen.getByRole("dialog", { name: "Shopping cart", hidden: true }),
    ).toHaveAttribute("aria-hidden", "false");
    expect(
      screen.getByRole("dialog", { name: "Settings", hidden: true }),
    ).toHaveAttribute("aria-hidden", "true");
  });
});
