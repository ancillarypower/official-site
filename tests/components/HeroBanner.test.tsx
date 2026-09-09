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
      screen.getByText("整合內容、3D 模型與商店的多功能平台"),
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

  it("checks prefers-reduced-motion", () => {
    render(
      <I18nProvider>
        <HeroBanner />
      </I18nProvider>,
    );
    expect(window.matchMedia).toHaveBeenCalledWith(
      "(prefers-reduced-motion: reduce)",
    );
  });
});
