import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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

describe("HeroBanner particle animation", () => {
  let rafSpy: ReturnType<typeof vi.fn>;
  let cafSpy: ReturnType<typeof vi.fn>;
  let getContextSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    rafSpy = vi.fn().mockReturnValue(1);
    cafSpy = vi.fn();
    vi.stubGlobal("requestAnimationFrame", rafSpy);
    vi.stubGlobal("cancelAnimationFrame", cafSpy);
    vi.stubGlobal("devicePixelRatio", 2);

    const mockGradient = { addColorStop: vi.fn() };
    const mockCtx = {
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
      setTransform: vi.fn(),
      createLinearGradient: vi.fn().mockReturnValue(mockGradient),
      strokeStyle: "",
      fillStyle: "",
      lineWidth: 0,
    };

    getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    getContextSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("initializes particle animation when canvas context is available", () => {
    render(
      <I18nProvider>
        <HeroBanner />
      </I18nProvider>,
    );
    expect(getContextSpy).toHaveBeenCalledWith("2d");
    expect(rafSpy).toHaveBeenCalled();
  });

  it("cleans up animation frame and resize listener on unmount", () => {
    const removeEventSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(
      <I18nProvider>
        <HeroBanner />
      </I18nProvider>,
    );
    unmount();
    expect(cafSpy).toHaveBeenCalled();
    expect(removeEventSpy).toHaveBeenCalledWith("resize", expect.any(Function));
    removeEventSpy.mockRestore();
  });

  it("adds resize event listener", () => {
    const addEventSpy = vi.spyOn(window, "addEventListener");
    render(
      <I18nProvider>
        <HeroBanner />
      </I18nProvider>,
    );
    expect(addEventSpy).toHaveBeenCalledWith("resize", expect.any(Function));
    addEventSpy.mockRestore();
  });
});
