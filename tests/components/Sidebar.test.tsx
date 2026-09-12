import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { useSettingsStore } from "@/stores/settingsStore";

vi.mock("@/components/layout/SettingsPanel", () => ({
  SettingsPanel: () => createElement("div", { "data-testid": "settings-panel" }, "Settings Panel"),
}));

vi.mock("@/components/store/CartPanel", () => ({
  CartPanel: () => createElement("div", { "data-testid": "cart-panel" }, "Cart Panel"),
}));

import { Sidebar } from "@/components/layout/Sidebar";

describe("Sidebar", () => {
  beforeEach(() => {
    useSettingsStore.setState({ activePanel: null });
  });

  it("renders two aside elements", () => {
    const { container } = render(createElement(Sidebar));
    expect(container.querySelectorAll("aside")).toHaveLength(2);
  });

  it("renders SettingsPanel and CartPanel", () => {
    render(createElement(Sidebar));
    expect(screen.getByTestId("settings-panel")).toBeInTheDocument();
    expect(screen.getByTestId("cart-panel")).toBeInTheDocument();
  });

  it("shows settings panel when activePanel is settings", () => {
    useSettingsStore.setState({ activePanel: "settings" });
    render(createElement(Sidebar));
    const settings = screen.getByRole("dialog", { name: "Settings", hidden: true });
    expect(settings.getAttribute("aria-hidden")).toBe("false");
  });

  it("shows cart panel when activePanel is cart", () => {
    useSettingsStore.setState({ activePanel: "cart" });
    render(createElement(Sidebar));
    const cart = screen.getByRole("dialog", { name: "Shopping cart", hidden: true });
    expect(cart.getAttribute("aria-hidden")).toBe("false");
  });

  it("hides both panels when activePanel is null", () => {
    render(createElement(Sidebar));
    const settings = screen.getByRole("dialog", { name: "Settings", hidden: true });
    const cart = screen.getByRole("dialog", { name: "Shopping cart", hidden: true });
    expect(settings.getAttribute("aria-hidden")).toBe("true");
    expect(cart.getAttribute("aria-hidden")).toBe("true");
  });

  it("closes panel when overlay is clicked", () => {
    useSettingsStore.setState({ activePanel: "settings" });
    const { container } = render(createElement(Sidebar));
    const overlay = container.querySelector("div[aria-hidden='true']");
    expect(overlay).toBeTruthy();
    fireEvent.click(overlay!);
    expect(useSettingsStore.getState().activePanel).toBeNull();
  });

  it("settings aside has translate-x-0 class when active", () => {
    useSettingsStore.setState({ activePanel: "settings" });
    render(createElement(Sidebar));
    const settings = screen.getByRole("dialog", { name: "Settings", hidden: true });
    expect(settings.className).toContain("translate-x-0");
  });

  it("cart aside has translate-x-full class when inactive", () => {
    useSettingsStore.setState({ activePanel: "settings" });
    render(createElement(Sidebar));
    const cart = screen.getByRole("dialog", { name: "Shopping cart", hidden: true });
    expect(cart.className).toContain("translate-x-full");
  });

  it("overlay has pointer-events-auto class when panel is open", () => {
    useSettingsStore.setState({ activePanel: "cart" });
    const { container } = render(createElement(Sidebar));
    const overlay = container.querySelector("div[aria-hidden='true']");
    expect(overlay?.className).toContain("pointer-events-auto");
  });

  it("overlay has pointer-events-none class when no panel is open", () => {
    const { container } = render(createElement(Sidebar));
    const overlay = container.querySelector("div[aria-hidden='true']");
    expect(overlay?.className).toContain("pointer-events-none");
  });
});
