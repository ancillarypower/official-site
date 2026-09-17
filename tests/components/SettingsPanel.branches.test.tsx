import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/context/I18nContext";
import { SettingsPanel } from "@/components/layout/SettingsPanel";
import { useSettingsStore } from "@/stores/settingsStore";

function withProviders(ui: React.ReactElement) {
  return <MemoryRouter><I18nProvider>{ui}</I18nProvider></MemoryRouter>;
}

describe("SettingsPanel branch coverage", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
    useSettingsStore.setState({
      wpUrl: "https://test.example.com",
      useProxy: false,
      contentType: "posts",
      perPage: 20,
      wooUseSameUrl: false,
      wooKey: "",
      wooSecret: "",
      wooUrl: "https://woo.example.com",
      wooPerPage: 20,
      activePanel: "settings",
      fontScale: 1,
      theme: "light",
    });
  });

  it("shows wooUrl input when wooUseSameUrl is false", () => {
    render(withProviders(<SettingsPanel />));
    expect(screen.getByDisplayValue("https://woo.example.com")).toBeInTheDocument();
  });

  it("hides wooUrl input when wooUseSameUrl is true", () => {
    useSettingsStore.setState({ wooUseSameUrl: true });
    render(withProviders(<SettingsPanel />));
    expect(screen.queryByDisplayValue("https://woo.example.com")).not.toBeInTheDocument();
  });

  it("changes perPage select", () => {
    render(withProviders(<SettingsPanel />));
    const selects = screen.getAllByRole("combobox");
    // perPage is the second select (after contentType)
    const perPageSelect = selects[1]!;
    fireEvent.change(perPageSelect, { target: { value: "50" } });
    expect(useSettingsStore.getState().perPage).toBe(50);
  });

  it("changes wooPerPage select", () => {
    render(withProviders(<SettingsPanel />));
    const selects = screen.getAllByRole("combobox");
    // wooPerPage is the last select
    const wooPerPageSelect = selects[selects.length - 1]!;
    fireEvent.change(wooPerPageSelect, { target: { value: "100" } });
    expect(useSettingsStore.getState().wooPerPage).toBe(100);
  });

  it("renders sepia theme button as active when sepia is selected", () => {
    useSettingsStore.setState({ theme: "sepia" });
    render(withProviders(<SettingsPanel />));
    const sepiaButton = screen.getByRole("radio", { name: /\u8B77\u773C/ });
    expect(sepiaButton).toHaveAttribute("aria-checked", "true");
  });

  it("toggles wooSecret visibility", () => {
    render(withProviders(<SettingsPanel />));
    const secretInput = screen.getByPlaceholderText("cs_xxx");
    expect(secretInput).toHaveAttribute("type", "password");
    const toggleBtn = screen.getByLabelText("Show secret");
    fireEvent.click(toggleBtn);
    expect(secretInput).toHaveAttribute("type", "text");
    const hideBtn = screen.getByLabelText("Hide secret");
    fireEvent.click(hideBtn);
    expect(secretInput).toHaveAttribute("type", "password");
  });

  describe("wooUrl debounce", () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it("updates wooUrl after debounce delay", () => {
      render(withProviders(<SettingsPanel />));
      const wooUrlInput = screen.getByDisplayValue("https://woo.example.com");
      fireEvent.change(wooUrlInput, { target: { value: "https://new-woo.example.com" } });
      expect(useSettingsStore.getState().wooUrl).toBe("https://woo.example.com");
      act(() => { vi.advanceTimersByTime(500); });
      expect(useSettingsStore.getState().wooUrl).toBe("https://new-woo.example.com");
    });
  });
});
