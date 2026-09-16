import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/context/I18nContext";
import { createElement } from "react";
import {
  RouteErrorBoundary,
  RouteErrorFallback,
} from "@/components/layout/RouteErrorBoundary";

// A component that throws on render to trigger the error boundary
function ThrowingComponent({ error }: { error: Error }) {
  throw error;
}

function renderWithProviders(ui: React.ReactElement) {
  return render(
    createElement(
      MemoryRouter,
      null,
      createElement(I18nProvider, null, ui)
    )
  );
}

describe("RouteErrorBoundary", () => {
  beforeEach(() => {
    // Suppress React error boundary console.error noise in test output
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders children when no error occurs", () => {
    renderWithProviders(
      createElement(
        RouteErrorBoundary,
        null,
        createElement("div", { "data-testid": "child" }, "Hello")
      )
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("displays route error fallback when child throws", () => {
    renderWithProviders(
      createElement(
        RouteErrorBoundary,
        null,
        createElement(ThrowingComponent, {
          error: new Error("ChunkLoadError: Loading chunk failed"),
        })
      )
    );

    // Should show the route-level error message, not the app-level one
    expect(
      screen.getByText(/\u6b64\u9801\u9762\u8f09\u5165\u5931\u6557|Failed to load this page/)
    ).toBeInTheDocument();

    // Should show a reload button
    expect(
      screen.getByText(/\u91cd\u65b0\u8f09\u5165|Reload/)
    ).toBeInTheDocument();
  });

  it("reload button calls window.location.reload", () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload: reloadMock },
      writable: true,
    });

    renderWithProviders(
      createElement(
        RouteErrorBoundary,
        null,
        createElement(ThrowingComponent, {
          error: new Error("Network error"),
        })
      )
    );

    const reloadButton = screen.getByText(
      /\u91cd\u65b0\u8f09\u5165|Reload/
    );
    fireEvent.click(reloadButton);
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it("logs error via componentDidCatch", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderWithProviders(
      createElement(
        RouteErrorBoundary,
        null,
        createElement(ThrowingComponent, {
          error: new Error("Test error"),
        })
      )
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      "[RouteErrorBoundary]",
      expect.any(Error),
      expect.any(String)
    );
  });
});

describe("RouteErrorFallback", () => {
  it("renders error message and reload button", () => {
    renderWithProviders(createElement(RouteErrorFallback));

    expect(
      screen.getByText(/\u6b64\u9801\u9762\u8f09\u5165\u5931\u6557|Failed to load this page/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/\u91cd\u65b0\u8f09\u5165|Reload/)
    ).toBeInTheDocument();
  });
});
