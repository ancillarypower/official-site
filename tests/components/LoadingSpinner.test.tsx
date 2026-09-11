import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

function withI18n(ui: React.ReactElement) {
  return <I18nProvider>{ui}</I18nProvider>;
}

describe("LoadingSpinner", () => {
  it("renders loading status with accessible role", () => {
    render(withI18n(<LoadingSpinner />));
    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
    expect(status).toHaveAttribute("aria-label", "載入中...");
  });

  it("renders loading text", () => {
    render(withI18n(<LoadingSpinner />));
    expect(screen.getByText("載入中...")).toBeInTheDocument();
  });

  it("renders three bounce dots", () => {
    const { container } = render(withI18n(<LoadingSpinner />));
    const dots = container.querySelectorAll(".animate-bounce");
    expect(dots).toHaveLength(3);
  });
});
