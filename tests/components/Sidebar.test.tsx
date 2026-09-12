import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

  it("hides both panels by default (aria-hidden true)", () => {
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

  it("closes panel when overlay is clicked", () => {
    useSettingsStore.setState({ activePanel: "settings" });
    renderSidebar();
    // The overlay is an aria-hidden div; click it
    const overlays = document.querySelectorAll('[aria-hidden="true"]');
    const overlay = Array.from(overlays).find(
      (el) => el.tagName === "DIV" && el.classList.contains("fixed") && el.classList.contains("z-\\[200\\")
    );
    // Fallback: click the first fixed overlay div
    const fixedDivs = document.querySelectorAll("div.fixed");
    for (const div of fixedDivs) {
      if (div.getAttribute("aria-hidden") === "true" && div.className.includes("bg-black")) {
        fireEvent.click(div);
        break;
      }
    }
    expect(useSettingsStore.getState().activePanel).toBeNull();
  });
});
