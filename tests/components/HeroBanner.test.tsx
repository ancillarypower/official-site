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
      screen.getByText(/\u4EE5 AI \u9A45\u52D5\u865B\u64EC\u96FB\u5EE0/),
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
