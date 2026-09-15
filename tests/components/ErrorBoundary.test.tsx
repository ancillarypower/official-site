import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>Safe content</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("Safe content")).toBeInTheDocument();
  });

  it("renders fallback UI on error", () => {
    function Bomb(): JSX.Element {
      throw new Error("Test explosion");
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.queryByText("Test explosion"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/unexpected error/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Reload Page")).toBeInTheDocument();
    spy.mockRestore();
  });

  it("shows generic message even when error has no message", () => {
    function Bomb(): JSX.Element {
      throw new Error();
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText(/unexpected error/i),
    ).toBeInTheDocument();
    spy.mockRestore();
  });

  it("reload button exists in error state", () => {
    function Bomb(): JSX.Element {
      throw new Error("Oops");
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    const btn = screen.getByText("Reload Page");
    expect(btn.tagName).toBe("BUTTON");
    spy.mockRestore();
  });

  it("does not display raw error message (credential leak prevention)", () => {
    const sensitiveUrl =
      "HTTP 401 at https://example.com/wp-json/wc/v3/orders?consumer_key=ck_live_xxx&consumer_secret=cs_live_xxx";
    function Bomb(): JSX.Element {
      throw new Error(sensitiveUrl);
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.queryByText(sensitiveUrl)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/consumer_key/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/consumer_secret/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/unexpected error/i),
    ).toBeInTheDocument();
    spy.mockRestore();
  });
});
