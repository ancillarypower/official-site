import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/context/I18nContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { useSettingsStore } from "@/stores/settingsStore";

function withProviders(ui: React.ReactElement) {
  return <MemoryRouter><I18nProvider>{ui}</I18nProvider></MemoryRouter>;
}

describe("Sidebar", () => {
  beforeEach(() => {
    useSettingsStore.setState({ activePanel: null, wooKey: "", wooSecret: "" });
  });

  it("renders overlay hidden when no panel is active", () => {
    const { container } = render(withProviders(<Sidebar />));
    const overlay = container.querySelector("[aria-hidden='true']");
    expect(overlay).toBeInTheDocument();
  });

  it("closes panel when overlay is clicked", () => {
    useSettingsStore.setState({ activePanel: "settings" });
    const { container } = render(withProviders(<Sidebar />));
    const overlay = container.querySelector(".fixed.inset-0");
    expect(overlay).toBeInTheDocument();
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

  it("marks settings dialog as hidden when cart is active", () => {
    useSettingsStore.setState({ activePanel: "cart" });
    render(withProviders(<Sidebar />));
    const settingsDialog = screen.getByRole("dialog", { name: "Settings", hidden: true });
    expect(settingsDialog).toHaveAttribute("aria-hidden", "true");
  });

  it("marks cart dialog as hidden when settings is active", () => {
    useSettingsStore.setState({ activePanel: "settings" });
    render(withProviders(<Sidebar />));
    const cartDialog = screen.getByRole("dialog", { name: "Shopping cart", hidden: true });
    expect(cartDialog).toHaveAttribute("aria-hidden", "true");
  });

  it("renders both dialogs simultaneously", () => {
    useSettingsStore.setState({ activePanel: "settings" });
    const { container } = render(withProviders(<Sidebar />));
    const asides = container.querySelectorAll("aside");
    expect(asides).toHaveLength(2);
  });
});
