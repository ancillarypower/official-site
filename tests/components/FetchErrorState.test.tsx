import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/context/I18nContext";
import { FetchErrorState } from "@/components/ui/FetchErrorState";
import { AppError } from "@/lib/errors";

function renderComponent(props: { error: unknown; onRetry?: () => void }) {
  return render(
    <MemoryRouter>
      <I18nProvider>
        <FetchErrorState {...props} />
      </I18nProvider>
    </MemoryRouter>,
  );
}

describe("FetchErrorState", () => {
  it("renders friendly message and settings button for network error", () => {
    const error = new TypeError("Failed to fetch");
    renderComponent({ error, onRetry: vi.fn() });
    expect(screen.getByText("\u7121\u6cd5\u9023\u7dda\u81f3 WordPress")).toBeInTheDocument();
    expect(
      screen.getByText(
        "\u8acb\u5728\u8a2d\u5b9a\u4e2d\u555f\u7528 CORS \u4ee3\u7406\uff0c\u6216\u78ba\u8a8d\u7db2\u5740\u662f\u5426\u6b63\u78ba",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("\u8a2d\u5b9a")).toBeInTheDocument();
    expect(screen.getByText("\u91cd\u8a66")).toBeInTheDocument();
  });

  it("renders HTTP status code for HTTP errors", () => {
    const error = new Error("HTTP 404");
    renderComponent({ error, onRetry: vi.fn() });
    expect(
      screen.getByText("\u4f3a\u670d\u5668\u56de\u61c9\u932f\u8aa4\uff08HTTP 404\uff09"),
    ).toBeInTheDocument();
    expect(screen.getByText("\u91cd\u8a66")).toBeInTheDocument();
    expect(screen.queryByText("\u8a2d\u5b9a")).not.toBeInTheDocument();
  });

  it("calls onRetry when retry button is clicked", () => {
    const onRetry = vi.fn();
    const error = new TypeError("Failed to fetch");
    renderComponent({ error, onRetry });
    fireEvent.click(screen.getByText("\u91cd\u8a66"));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("AppError displays its i18n code message instead of network error (regression #564)", () => {
    const error = new AppError(
      "error_proxy_credential_blocked",
      "Credentials must not be sent through proxy",
    );
    renderComponent({ error, onRetry: vi.fn() });
    // Should show the AppError i18n translation, not the network error
    expect(
      screen.getByText(
        "\u4e0d\u53ef\u900f\u904e\u7b2c\u4e09\u65b9\u4ee3\u7406\u50b3\u9001 WooCommerce \u6191\u8b49\uff0c\u8acb\u95dc\u9589\u4ee3\u7406\u6216\u4f7f\u7528\u81ea\u67b6\u4ee3\u7406",
      ),
    ).toBeInTheDocument();
    // Must NOT show the misleading network error
    expect(
      screen.queryByText("\u7121\u6cd5\u9023\u7dda\u81f3 WordPress"),
    ).not.toBeInTheDocument();
    // Settings button should not appear for non-network errors
    expect(screen.queryByText("\u8a2d\u5b9a")).not.toBeInTheDocument();
  });

  it("unknown Error displays generic error message instead of network error (regression #564)", () => {
    const error = new Error("something broke");
    renderComponent({ error, onRetry: vi.fn() });
    // Should show the generic error message
    expect(
      screen.getByText(
        "\u767c\u751f\u610f\u5916\u932f\u8aa4\uff0c\u8acb\u91cd\u65b0\u8f09\u5165\u9801\u9762\u3002",
      ),
    ).toBeInTheDocument();
    // Must NOT show the misleading network error
    expect(
      screen.queryByText("\u7121\u6cd5\u9023\u7dda\u81f3 WordPress"),
    ).not.toBeInTheDocument();
  });
});
