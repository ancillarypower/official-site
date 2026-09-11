import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nProvider, useI18n } from "@/context/I18nContext";

function TestConsumer() {
  const { lang, toggleLang, t } = useI18n();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="translated">{t("loading")}</span>
      <span data-testid="replaced">{t("models_loaded", { n: 5 })}</span>
      <button onClick={toggleLang}>Toggle</button>
    </div>
  );
}

describe("I18nContext", () => {
  it("defaults to zh language", () => {
    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>,
    );
    expect(screen.getByTestId("lang")).toHaveTextContent("zh");
  });

  it("translates keys in zh", () => {
    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>,
    );
    expect(screen.getByTestId("translated")).toHaveTextContent("載入中...");
  });

  it("handles replacement tokens", () => {
    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>,
    );
    expect(screen.getByTestId("replaced")).toHaveTextContent("5 個已載入");
  });

  it("toggles to en", () => {
    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByText("Toggle"));
    expect(screen.getByTestId("lang")).toHaveTextContent("en");
  });

  it("toggles back to zh", () => {
    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByText("Toggle"));
    fireEvent.click(screen.getByText("Toggle"));
    expect(screen.getByTestId("lang")).toHaveTextContent("zh");
  });

  it("throws when useI18n is called outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      "useI18n must be used within I18nProvider",
    );
    spy.mockRestore();
  });
});
