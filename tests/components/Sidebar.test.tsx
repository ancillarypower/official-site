import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/context/I18nContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { useSettingsStore } from "@/stores/settingsStore";
import { useCartStore } from "@/stores/cartStore";

function withProviders(ui: React.ReactElement) {
  return <MemoryRouter><I18nProvider>{ui}</I18nProvider></MemoryRouter>;
}

describe("Sidebar", () => {
  beforeEach(() => {
    useSettingsStore.setState({ activePanel: null });
    useCartStore.setState({ items: [] });
  });

  it("renders both sidebar panels", () => {
    render(withProviders(<Sidebar />));
    const dialogs = screen.getAllByRole("dialog", { hidden: true });
    expect(dialogs).toHaveLength(2);
  });

  it("shows settings panel when activePanel is settings", () => {
    useSettingsStore.setState({ activePanel: "settings" });
    render(withProviders(<Sidebar />));
    const panel = screen.getByRole("dialog", { name: "Settings" });
    expect(panel).toHaveAttribute("aria-hidden", "false");
  });

  it("shows cart panel when activePanel is cart", () => {
    useSettingsStore.setState({ activePanel: "cart" });
    render(withProviders(<Sidebar />));
    const panel = screen.getByRole("dialog", { name: "Shopping cart" });
    expect(panel).toHaveAttribute("aria-hidden", "false");
  });

  it("hides both panels when activePanel is null", () => {
    render(withProviders(<Sidebar />));
    const dialogs = screen.getAllByRole("dialog", { hidden: true });
    dialogs.forEach((d) => expect(d).toHaveAttribute("aria-hidden", "true"));
  });

  it("closes panel when clicking overlay", () => {
    useSettingsStore.setState({ activePanel: "settings" });
    const { container } = render(withProviders(<Sidebar />));
    // Overlay is the first direct child (the backdrop div)
    const overlay = container.firstElementChild?.firstElementChild;
    expect(overlay).toBeTruthy();
    fireEvent.click(overlay!);
    expect(useSettingsStore.getState().activePanel).toBeNull();
  });
});
