import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
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
    const select = screen.getByDisplayValue("\u6D88\u606F");
    fireEvent.change(select, { target: { value: "pages" } });
    expect(useSettingsStore.getState().contentType).toBe("pages");
  });

  it("renders WooCommerce section", () => {
    render(withProviders(<SettingsPanel />));
    expect(screen.getByText("Consumer Key")).toBeInTheDocument();
  });

  it("closes panel", () => {
    render(withProviders(<SettingsPanel />));
    fireEvent.click(screen.getByLabelText("\u95DC\u9589"));
    expect(useSettingsStore.getState().activePanel).toBeNull();
  });

  it("renders FontSizeControl with increase and decrease buttons", () => {
    render(withProviders(<SettingsPanel />));
    expect(screen.getByText("\u5B57\u9AD4\u5927\u5C0F")).toBeInTheDocument();
    expect(screen.getByLabelText("\u7E2E\u5C0F\u5B57\u9AD4")).toBeInTheDocument();
    expect(screen.getByLabelText("\u653E\u5927\u5B57\u9AD4")).toBeInTheDocument();
    expect(screen.getByLabelText("\u5B57\u9AD4\u5927\u5C0F")).toBeInTheDocument();
  });

  it("adjusts font scale via FontSizeControl buttons", () => {
    render(withProviders(<SettingsPanel />));
    fireEvent.click(screen.getByLabelText("\u653E\u5927\u5B57\u9AD4"));
    expect(useSettingsStore.getState().fontScale).toBeCloseTo(1.1, 1);
    fireEvent.click(screen.getByLabelText("\u7E2E\u5C0F\u5B57\u9AD4"));
    expect(useSettingsStore.getState().fontScale).toBeCloseTo(1.0, 1);
  });

  it("renders theme section with three theme radio buttons", () => {
    render(withProviders(<SettingsPanel />));
    expect(screen.getByText(/\u95B1\u8B80\u4E3B\u984C/)).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
  });

  it("switches theme when clicking a theme button", () => {
    render(withProviders(<SettingsPanel />));
    const darkButton = screen.getByRole("radio", { name: /\u6DF1\u8272/ });
    fireEvent.click(darkButton);
    expect(useSettingsStore.getState().theme).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("highlights the active theme button", () => {
    render(withProviders(<SettingsPanel />));
    const lightButton = screen.getByRole("radio", { name: /\u660E\u4EAE/ });
    expect(lightButton).toHaveAttribute("aria-checked", "true");
    const darkButton = screen.getByRole("radio", { name: /\u6DF1\u8272/ });
    expect(darkButton).toHaveAttribute("aria-checked", "false");
  });

  it("toggles wooUseSameUrl checkbox", () => {
    render(withProviders(<SettingsPanel />));
    const checkboxes = screen.getAllByRole("checkbox");
    const sameUrlCheckbox = checkboxes[1]!;
    expect(sameUrlCheckbox).toBeChecked();
    fireEvent.click(sameUrlCheckbox);
    expect(useSettingsStore.getState().wooUseSameUrl).toBe(false);
  });

  // --- Credential masking tests (regression #92) ---

  it("masks wooKey input by default (regression #92)", () => {
    render(withProviders(<SettingsPanel />));
    const keyInput = screen.getByPlaceholderText("ck_xxx");
    expect(keyInput).toHaveAttribute("type", "password");
  });

  it("toggles wooKey visibility on button click (regression #92)", () => {
    render(withProviders(<SettingsPanel />));
    const keyInput = screen.getByPlaceholderText("ck_xxx");
    expect(keyInput).toHaveAttribute("type", "password");
    const toggleBtn = screen.getByLabelText("\u986F\u793A\u91D1\u9470");
    fireEvent.click(toggleBtn);
    expect(keyInput).toHaveAttribute("type", "text");
    const hideBtn = screen.getByLabelText("\u96B1\u85CF\u91D1\u9470");
    fireEvent.click(hideBtn);
    expect(keyInput).toHaveAttribute("type", "password");
  });

  // --- Arrow key navigation tests (regression #134) ---

  it("navigates themes with ArrowRight/ArrowLeft keys (regression #134)", () => {
    render(withProviders(<SettingsPanel />));
    const lightRadio = screen.getByRole("radio", { name: /\u660E\u4EAE/ });

    // ArrowRight: light → sepia
    fireEvent.keyDown(lightRadio, { key: "ArrowRight" });
    expect(useSettingsStore.getState().theme).toBe("sepia");

    // Re-query because the focused element changes after state update
    const sepiaRadio = screen.getByRole("radio", { name: /\u61F7\u820A/ });
    expect(sepiaRadio).toHaveAttribute("aria-checked", "true");

    // ArrowLeft: sepia → light
    fireEvent.keyDown(sepiaRadio, { key: "ArrowLeft" });
    expect(useSettingsStore.getState().theme).toBe("light");

    // ArrowLeft from light wraps to dark (circular)
    const lightRadioAgain = screen.getByRole("radio", { name: /\u660E\u4EAE/ });
    fireEvent.keyDown(lightRadioAgain, { key: "ArrowLeft" });
    expect(useSettingsStore.getState().theme).toBe("dark");

    // ArrowRight from dark wraps to light (circular)
    const darkRadio = screen.getByRole("radio", { name: /\u6DF1\u8272/ });
    fireEvent.keyDown(darkRadio, { key: "ArrowRight" });
    expect(useSettingsStore.getState().theme).toBe("light");
  });

  it("only selected theme radio has tabIndex 0, others have -1 (regression #134)", () => {
    render(withProviders(<SettingsPanel />));
    const lightRadio = screen.getByRole("radio", { name: /\u660E\u4EAE/ });
    const sepiaRadio = screen.getByRole("radio", { name: /\u61F7\u820A/ });
    const darkRadio = screen.getByRole("radio", { name: /\u6DF1\u8272/ });

    // Initial state: light is selected
    expect(lightRadio).toHaveAttribute("tabindex", "0");
    expect(sepiaRadio).toHaveAttribute("tabindex", "-1");
    expect(darkRadio).toHaveAttribute("tabindex", "-1");

    // Switch to dark
    fireEvent.click(darkRadio);
    expect(lightRadio).toHaveAttribute("tabindex", "-1");
    expect(sepiaRadio).toHaveAttribute("tabindex", "-1");
    expect(darkRadio).toHaveAttribute("tabindex", "0");
  });

  // --- Debounced text input tests (regression #88) ---

  describe("debounced text inputs", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("does not update store immediately on URL input (regression #88)", () => {
      render(withProviders(<SettingsPanel />));
      const urlInput = screen.getByDisplayValue("https://test.example.com");
      fireEvent.change(urlInput, { target: { value: "https://new.example.com" } });
      expect(urlInput).toHaveValue("https://new.example.com");
      expect(useSettingsStore.getState().wpUrl).toBe("https://test.example.com");
    });

    it("updates store after 500ms debounce delay", () => {
      render(withProviders(<SettingsPanel />));
      const urlInput = screen.getByDisplayValue("https://test.example.com");
      fireEvent.change(urlInput, { target: { value: "https://new.example.com" } });
      act(() => { vi.advanceTimersByTime(500); });
      expect(useSettingsStore.getState().wpUrl).toBe("https://new.example.com");
    });

    it("updates site URL on input change after debounce", () => {
      render(withProviders(<SettingsPanel />));
      const urlInput = screen.getByDisplayValue("https://test.example.com");
      fireEvent.change(urlInput, { target: { value: "https://new.example.com" } });
      act(() => { vi.advanceTimersByTime(500); });
      expect(useSettingsStore.getState().wpUrl).toBe("https://new.example.com");
    });

    it("updates WooCommerce key on input after debounce", () => {
      render(withProviders(<SettingsPanel />));
      const keyInput = screen.getByPlaceholderText("ck_xxx");
      fireEvent.change(keyInput, { target: { value: "ck_test123" } });
      expect(useSettingsStore.getState().wooKey).toBe("");
      act(() => { vi.advanceTimersByTime(500); });
      expect(useSettingsStore.getState().wooKey).toBe("ck_test123");
    });

    it("updates WooCommerce secret on input after debounce", () => {
      render(withProviders(<SettingsPanel />));
      const secretInput = screen.getByPlaceholderText("cs_xxx");
      fireEvent.change(secretInput, { target: { value: "cs_secret456" } });
      expect(useSettingsStore.getState().wooSecret).toBe("");
      act(() => { vi.advanceTimersByTime(500); });
      expect(useSettingsStore.getState().wooSecret).toBe("cs_secret456");
    });

    it("resets debounce timer on rapid typing", () => {
      render(withProviders(<SettingsPanel />));
      const urlInput = screen.getByDisplayValue("https://test.example.com");
      fireEvent.change(urlInput, { target: { value: "https://a" } });
      act(() => { vi.advanceTimersByTime(300); });
      fireEvent.change(urlInput, { target: { value: "https://ab" } });
      act(() => { vi.advanceTimersByTime(300); });
      expect(useSettingsStore.getState().wpUrl).toBe("https://test.example.com");
      act(() => { vi.advanceTimersByTime(200); });
      expect(useSettingsStore.getState().wpUrl).toBe("https://ab");
    });
  });
});
