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
    document.documentElement.removeAttribute("data-theme");
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
      theme: "light",
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

  it("renders FontSizeControl", () => {
    render(withProviders(<SettingsPanel />));
    expect(screen.getByText("\u5B57\u9AD4\u5927\u5C0F")).toBeInTheDocument();
    expect(screen.getByLabelText("Decrease font size")).toBeInTheDocument();
    expect(screen.getByLabelText("Increase font size")).toBeInTheDocument();
  });

  it("adjusts font scale", () => {
    render(withProviders(<SettingsPanel />));
    fireEvent.click(screen.getByLabelText("Increase font size"));
    expect(useSettingsStore.getState().fontScale).toBeCloseTo(1.1, 1);
    fireEvent.click(screen.getByLabelText("Decrease font size"));
    expect(useSettingsStore.getState().fontScale).toBeCloseTo(1.0, 1);
  });

  it("renders three theme radio buttons", () => {
    render(withProviders(<SettingsPanel />));
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
  });

  it("switches theme", () => {
    render(withProviders(<SettingsPanel />));
    fireEvent.click(screen.getByRole("radio", { name: /\u6DF1\u8272/ }));
    expect(useSettingsStore.getState().theme).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("highlights the active theme", () => {
    render(withProviders(<SettingsPanel />));
    expect(screen.getByRole("radio", { name: /\u660E\u4EAE/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /\u6DF1\u8272/ })).toHaveAttribute("aria-checked", "false");
  });

  it("toggles wooUseSameUrl", () => {
    render(withProviders(<SettingsPanel />));
    const checkboxes = screen.getAllByRole("checkbox");
    const sameUrlCheckbox = checkboxes[1]!;
    expect(sameUrlCheckbox).toBeChecked();
    fireEvent.click(sameUrlCheckbox);
    expect(useSettingsStore.getState().wooUseSameUrl).toBe(false);
  });

  it("updates site URL", () => {
    render(withProviders(<SettingsPanel />));
    fireEvent.change(screen.getByDisplayValue("https://test.example.com"), { target: { value: "https://new.example.com" } });
    expect(useSettingsStore.getState().wpUrl).toBe("https://new.example.com");
  });

  it("updates WooCommerce key", () => {
    render(withProviders(<SettingsPanel />));
    fireEvent.change(screen.getByPlaceholderText("ck_xxx"), { target: { value: "ck_test123" } });
    expect(useSettingsStore.getState().wooKey).toBe("ck_test123");
  });

  it("updates WooCommerce secret", () => {
    render(withProviders(<SettingsPanel />));
    fireEvent.change(screen.getByPlaceholderText("cs_xxx"), { target: { value: "cs_secret" } });
    expect(useSettingsStore.getState().wooSecret).toBe("cs_secret");
  });

  it("changes per page", () => {
    render(withProviders(<SettingsPanel />));
    const selects = screen.getAllByDisplayValue("20");
    fireEvent.change(selects[0]!, { target: { value: "50" } });
    expect(useSettingsStore.getState().perPage).toBe(50);
  });
});
