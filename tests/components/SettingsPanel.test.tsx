import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/context/I18nContext";
import { SettingsPanel } from "@/components/layout/SettingsPanel";
import { useSettingsStore } from "@/stores/settingsStore";

function withProviders(ui: React.ReactElement) {
  return <MemoryRouter><I18nProvider>{ui}</I18nProvider></MemoryRouter>;
}

describe("SettingsPanel", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      wpUrl: "https://test.example.com",
      useProxy: false,
      contentType: "posts",
      perPage: 20,
      wooUseSameUrl: true,
      wooKey: "",
      wooSecret: "",
      wooUrl: "",
      wooPerPage: 20,
      activePanel: "settings",
      fontScale: 1,
    });
  });

  it("renders settings title", () => {
    render(withProviders(<SettingsPanel />));
    expect(screen.getByText("\u8A2D\u5B9A")).toBeInTheDocument();
  });

  it("renders site URL input", () => {
    render(withProviders(<SettingsPanel />));
    expect(screen.getByDisplayValue("https://test.example.com")).toBeInTheDocument();
  });

  it("toggles CORS proxy checkbox", () => {
    render(withProviders(<SettingsPanel />));
    const checkbox = screen.getByRole("checkbox", { name: /CORS/ });
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(useSettingsStore.getState().useProxy).toBe(true);
  });

  it("changes content type", () => {
    render(withProviders(<SettingsPanel />));
    const select = screen.getByDisplayValue("\u6587\u7AE0");
    fireEvent.change(select, { target: { value: "pages" } });
    expect(useSettingsStore.getState().contentType).toBe("pages");
  });

  it("renders WooCommerce section", () => {
    render(withProviders(<SettingsPanel />));
    expect(screen.getByText("Consumer Key")).toBeInTheDocument();
  });

  it("closes panel", () => {
    render(withProviders(<SettingsPanel />));
    fireEvent.click(screen.getByLabelText("Close"));
    expect(useSettingsStore.getState().activePanel).toBeNull();
  });

  it("renders FontSizeControl with increase and decrease buttons", () => {
    render(withProviders(<SettingsPanel />));
    expect(screen.getByText("\u5B57\u9AD4\u5927\u5C0F")).toBeInTheDocument();
    expect(screen.getByLabelText("Decrease font size")).toBeInTheDocument();
    expect(screen.getByLabelText("Increase font size")).toBeInTheDocument();
    expect(screen.getByLabelText("Font size")).toBeInTheDocument();
  });

  it("adjusts font scale via FontSizeControl buttons", () => {
    render(withProviders(<SettingsPanel />));
    fireEvent.click(screen.getByLabelText("Increase font size"));
    expect(useSettingsStore.getState().fontScale).toBeCloseTo(1.1, 1);
    fireEvent.click(screen.getByLabelText("Decrease font size"));
    expect(useSettingsStore.getState().fontScale).toBeCloseTo(1.0, 1);
  });
});
