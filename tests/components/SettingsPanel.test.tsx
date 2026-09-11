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
    });
  });

  it("renders settings title", () => {
    render(withProviders(<SettingsPanel />));
    expect(screen.getByText("\u8A2D\u5B9A")).toBeInTheDocument();
  });

  it("renders site URL input with current value", () => {
    render(withProviders(<SettingsPanel />));
    const input = screen.getByDisplayValue("https://test.example.com");
    expect(input).toBeInTheDocument();
  });

  it("renders CORS proxy checkbox", () => {
    render(withProviders(<SettingsPanel />));
    expect(screen.getByText("\u4F7F\u7528 CORS \u4EE3\u7406")).toBeInTheDocument();
  });

  it("renders content type selector", () => {
    render(withProviders(<SettingsPanel />));
    expect(screen.getByText("\u5167\u5BB9\u985E\u578B")).toBeInTheDocument();
    expect(screen.getByDisplayValue("\u6587\u7AE0")).toBeInTheDocument();
  });

  it("renders WooCommerce section", () => {
    render(withProviders(<SettingsPanel />));
    expect(screen.getByText("Consumer Key")).toBeInTheDocument();
    expect(screen.getByText("Consumer Secret")).toBeInTheDocument();
  });

  it("toggles wooUseSameUrl checkbox", () => {
    render(withProviders(<SettingsPanel />));
    const checkbox = screen.getByText("\u4F7F\u7528\u4E0A\u65B9\u76F8\u540C\u7DB2\u5740").previousElementSibling as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    fireEvent.click(checkbox);
    expect(useSettingsStore.getState().wooUseSameUrl).toBe(false);
  });

  it("shows separate WooCommerce URL when not using same URL", () => {
    useSettingsStore.setState({ wooUseSameUrl: false });
    render(withProviders(<SettingsPanel />));
    expect(screen.getByText("\u5546\u5E97\u7DB2\u5740")).toBeInTheDocument();
  });

  it("updates content type", () => {
    render(withProviders(<SettingsPanel />));
    const select = screen.getByDisplayValue("\u6587\u7AE0");
    fireEvent.change(select, { target: { value: "pages" } });
    expect(useSettingsStore.getState().contentType).toBe("pages");
  });

  it("renders close button", () => {
    render(withProviders(<SettingsPanel />));
    expect(screen.getByLabelText("Close")).toBeInTheDocument();
  });

  it("renders footer text", () => {
    render(withProviders(<SettingsPanel />));
    expect(screen.getByText(/wp-json/)).toBeInTheDocument();
  });
});
