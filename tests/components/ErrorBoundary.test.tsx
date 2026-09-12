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
    expect(screen.getByText("Test explosion")).toBeInTheDocument();
    expect(screen.getByText("Reload Page")).toBeInTheDocument();
    spy.mockRestore();
  });

  it("shows generic message when error has no message", () => {
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
});
