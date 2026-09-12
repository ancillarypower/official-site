import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

function renderSpinner() {
  return render(
    <I18nProvider>
      <LoadingSpinner />
    </I18nProvider>,
  );
}

describe("LoadingSpinner", () => {
  it("renders loading text", () => {
    renderSpinner();
    expect(screen.getByText("載入中...")).toBeInTheDocument();
  });

  it("has status role for accessibility", () => {
    renderSpinner();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("has aria-label matching loading text", () => {
    renderSpinner();
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "載入中...",
    );
  });

  it("renders three animated dots", () => {
    const { container } = renderSpinner();
    const dots = container.querySelectorAll(".animate-bounce");
    expect(dots).toHaveLength(3);
  });
});
