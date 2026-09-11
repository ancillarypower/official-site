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

  it("updates site URL on change", () => {
    render(withProviders(<SettingsPanel />));
    const input = screen.getByDisplayValue("https://test.example.com");
    fireEvent.change(input, { target: { value: "https://new.example.com" } });
    expect(useSettingsStore.getState().wpUrl).toBe("https://new.example.com");
  });

  it("renders and toggles CORS proxy checkbox", () => {
    render(withProviders(<SettingsPanel />));
    const checkbox = screen.getByRole("checkbox", { name: /CORS/ });
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(useSettingsStore.getState().useProxy).toBe(true);
  });

  it("renders content type selector and changes it", () => {
    render(withProviders(<SettingsPanel />));
    const select = screen.getByDisplayValue("\u6587\u7AE0");
    fireEvent.change(select, { target: { value: "pages" } });
    expect(useSettingsStore.getState().contentType).toBe("pages");
  });

  it("renders WooCommerce section", () => {
    render(withProviders(<SettingsPanel />));
    expect(screen.getByText("Consumer Key")).toBeInTheDocument();
    expect(screen.getByText("Consumer Secret")).toBeInTheDocument();
  });

  it("toggles wooUseSameUrl checkbox", () => {
    render(withProviders(<SettingsPanel />));
    const checkbox = screen.getByRole("checkbox", { name: /\u4F7F\u7528\u4E0A\u65B9\u76F8\u540C\u7DB2\u5740/ });
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    expect(useSettingsStore.getState().wooUseSameUrl).toBe(false);
  });

  it("shows separate WooCommerce URL when not using same URL", () => {
    useSettingsStore.setState({ wooUseSameUrl: false });
    render(withProviders(<SettingsPanel />));
    expect(screen.getByText("\u5546\u5E97\u7DB2\u5740")).toBeInTheDocument();
  });

  it("hides separate WooCommerce URL when using same URL", () => {
    render(withProviders(<SettingsPanel />));
    expect(screen.queryByText("\u5546\u5E97\u7DB2\u5740")).toBeNull();
  });

  it("updates per-page setting", () => {
    render(withProviders(<SettingsPanel />));
    const selects = screen.getAllByDisplayValue("20");
    // First 20 select is WP per-page, second is Woo per-page
    fireEvent.change(selects[0]!, { target: { value: "50" } });
    expect(useSettingsStore.getState().perPage).toBe(50);
  });

  it("renders close button", () => {
    render(withProviders(<SettingsPanel />));
    expect(screen.getByLabelText("Close")).toBeInTheDocument();
  });

  it("closes panel when close button clicked", () => {
    render(withProviders(<SettingsPanel />));
    fireEvent.click(screen.getByLabelText("Close"));
    expect(useSettingsStore.getState().activePanel).toBeNull();
  });

  it("renders footer text", () => {
    render(withProviders(<SettingsPanel />));
    expect(screen.getByText(/wp-json/)).toBeInTheDocument();
  });
});
