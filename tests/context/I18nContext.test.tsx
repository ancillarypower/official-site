import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nProvider, useI18n } from "@/context/I18nContext";

function TestConsumer() {
  const { lang, toggleLang, t } = useI18n();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="translated">{t("nav_content")}</span>
      <span data-testid="interpolated">{t("total_items", { n: 42 })}</span>
      <span data-testid="repeated">{t("{n} of {n}" as never, { n: 5 })}</span>
      <button onClick={toggleLang}>Toggle</button>
    </div>
  );
}

function mockNavigatorLanguage(lang: string) {
  Object.defineProperty(navigator, "language", {
    value: lang,
    configurable: true,
  });
}

describe("I18nContext", () => {
  const originalLanguage = navigator.language;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "";
    // Default to zh-TW so existing tests that assume Chinese default still pass
    mockNavigatorLanguage("zh-TW");
  });

  afterEach(() => {
    mockNavigatorLanguage(originalLanguage);
  });

  it("defaults to Chinese when browser language is Chinese", () => {
    render(<I18nProvider><TestConsumer /></I18nProvider>);
    expect(screen.getByTestId("lang").textContent).toBe("zh");
    expect(screen.getByTestId("translated").textContent).toBe("消息");
  });

  it("toggles to English", () => {
    render(<I18nProvider><TestConsumer /></I18nProvider>);
    fireEvent.click(screen.getByText("Toggle"));
    expect(screen.getByTestId("lang").textContent).toBe("en");
    expect(screen.getByTestId("translated").textContent).toBe("News");
  });

  it("interpolates replacements", () => {
    render(<I18nProvider><TestConsumer /></I18nProvider>);
    expect(screen.getByTestId("interpolated").textContent).toBe("共 42 項");
  });

  it("interpolates after lang toggle", () => {
    render(<I18nProvider><TestConsumer /></I18nProvider>);
    fireEvent.click(screen.getByText("Toggle"));
    expect(screen.getByTestId("interpolated").textContent).toBe("42 total");
  });

  it("throws when used outside provider", () => {
    expect(() => render(<TestConsumer />)).toThrow("useI18n must be used within I18nProvider");
  });

  // --- localStorage persistence tests ---

  it("reads initial language from localStorage", () => {
    localStorage.setItem("ap-lang", "en");
    render(<I18nProvider><TestConsumer /></I18nProvider>);
    expect(screen.getByTestId("lang").textContent).toBe("en");
    expect(screen.getByTestId("translated").textContent).toBe("News");
  });

  it("persists language choice to localStorage on toggle", () => {
    render(<I18nProvider><TestConsumer /></I18nProvider>);
    expect(localStorage.getItem("ap-lang")).toBeNull();
    fireEvent.click(screen.getByText("Toggle"));
    expect(localStorage.getItem("ap-lang")).toBe("en");
  });

  it("falls back to zh when localStorage has invalid value", () => {
    localStorage.setItem("ap-lang", "fr");
    render(<I18nProvider><TestConsumer /></I18nProvider>);
    expect(screen.getByTestId("lang").textContent).toBe("zh");
  });

  // --- document.documentElement.lang sync tests (regression #119) ---

  it("sets document.documentElement.lang to zh-TW on mount", () => {
    render(<I18nProvider><TestConsumer /></I18nProvider>);
    expect(document.documentElement.lang).toBe("zh-TW");
  });

  it("updates document.documentElement.lang on toggle (regression #119)", () => {
    render(<I18nProvider><TestConsumer /></I18nProvider>);
    expect(document.documentElement.lang).toBe("zh-TW");
    fireEvent.click(screen.getByText("Toggle"));
    expect(document.documentElement.lang).toBe("en");
    fireEvent.click(screen.getByText("Toggle"));
    expect(document.documentElement.lang).toBe("zh-TW");
  });

  // --- repeated placeholder regression test (#139) ---

  it("replaces all occurrences of the same placeholder (regression #139)", () => {
    render(<I18nProvider><TestConsumer /></I18nProvider>);
    expect(screen.getByTestId("repeated").textContent).toBe("5 of 5");
  });

  // --- browser language detection tests (regression #141) ---

  it("detects English browser language when no stored preference (regression #141)", () => {
    mockNavigatorLanguage("en-US");
    render(<I18nProvider><TestConsumer /></I18nProvider>);
    expect(screen.getByTestId("lang").textContent).toBe("en");
    expect(screen.getByTestId("translated").textContent).toBe("News");
  });

  it("detects Chinese browser language variants (regression #141)", () => {
    mockNavigatorLanguage("zh-CN");
    render(<I18nProvider><TestConsumer /></I18nProvider>);
    expect(screen.getByTestId("lang").textContent).toBe("zh");
    expect(screen.getByTestId("translated").textContent).toBe("消息");
  });
});
