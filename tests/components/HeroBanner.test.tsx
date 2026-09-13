import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";
import { HeroBanner } from "@/components/layout/HeroBanner";

const mockCtx = {
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  fillRect: vi.fn(),
  createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
  setTransform: vi.fn(),
  strokeStyle: "",
  lineWidth: 0,
  fillStyle: "",
};

describe("HeroBanner", () => {
  beforeEach(() => {
    vi.stubGlobal("devicePixelRatio", 1);
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      mockCtx as unknown as CanvasRenderingContext2D,
    );
    Object.values(mockCtx).forEach((v) => {
      if (typeof v === "function" && "mockClear" in v) {
        (v as ReturnType<typeof vi.fn>).mockClear();
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it("initializes canvas 2D context and draws particles", () => {
    render(
      <I18nProvider>
        <HeroBanner />
      </I18nProvider>,
    );
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith("2d");
    expect(mockCtx.setTransform).toHaveBeenCalled();
    expect(mockCtx.clearRect).toHaveBeenCalled();
    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.arc).toHaveBeenCalled();
    expect(mockCtx.fill).toHaveBeenCalled();
    expect(mockCtx.createLinearGradient).toHaveBeenCalled();
    expect(mockCtx.fillRect).toHaveBeenCalled();
  });

  it("handles prefers-reduced-motion", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: true }),
    );
    render(
      <I18nProvider>
        <HeroBanner />
      </I18nProvider>,
    );
    // Still draws particles (just doesn't move them)
    expect(mockCtx.arc).toHaveBeenCalled();
  });

  it("cleans up on unmount", () => {
    const { unmount } = render(
      <I18nProvider>
        <HeroBanner />
      </I18nProvider>,
    );
    unmount();
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });
});
