import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nProvider, useI18n } from "@/context/I18nContext";

function TestConsumer() {
  const { lang, toggleLang, t } = useI18n();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="translated">{t("nav_content")}</span>
      <span data-testid="interpolated">{t("total_items", { n: 42 })}</span>
      <button onClick={toggleLang}>Toggle</button>
    </div>
  );
}

describe("I18nContext", () => {
  it("defaults to Chinese", () => {
    render(<I18nProvider><TestConsumer /></I18nProvider>);
    expect(screen.getByTestId("lang").textContent).toBe("zh");
    expect(screen.getByTestId("translated").textContent).toBe("內容");
  });

  it("toggles to English", () => {
    render(<I18nProvider><TestConsumer /></I18nProvider>);
    fireEvent.click(screen.getByText("Toggle"));
    expect(screen.getByTestId("lang").textContent).toBe("en");
    expect(screen.getByTestId("translated").textContent).toBe("Content");
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
});
