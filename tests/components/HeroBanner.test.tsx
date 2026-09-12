import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";
import { HeroBanner } from "@/components/layout/HeroBanner";

describe("HeroBanner", () => {
  it("renders banner title and subtitle", () => {
    render(
      <I18nProvider>
        <HeroBanner />
      </I18nProvider>,
    );
    expect(screen.getByText("Ancillary Power")).toBeInTheDocument();
    expect(
      screen.getByText(/以 AI 驅動虛擬電廠/),
    ).toBeInTheDocument();
  });

  it("renders a canvas element", () => {
    const { container } = render(
      <I18nProvider>
        <HeroBanner />
      </I18nProvider>,
    );
    expect(container.querySelector("canvas")).toBeInTheDocument();
  });

  it("renders without errors", () => {
    expect(() => {
      render(
        <I18nProvider>
          <HeroBanner />
        </I18nProvider>,
      );
    }).not.toThrow();
  });
});
