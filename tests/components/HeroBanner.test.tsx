import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";
import { HeroBanner } from "@/components/layout/HeroBanner";

type IOCallback = (entries: Partial<IntersectionObserverEntry>[]) => void;

let ioCallback: IOCallback | null = null;
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

const mockCtx = {
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  fillRect: vi.fn(),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  setTransform: vi.fn(),
  strokeStyle: "",
  lineWidth: 0,
  fillStyle: "" as string | CanvasGradient,
};

let rafId = 0;
const rafSpy = vi
  .spyOn(window, "requestAnimationFrame")
  .mockImplementation(() => ++rafId);
const cafSpy = vi
  .spyOn(window, "cancelAnimationFrame")
  .mockImplementation(() => {});

beforeEach(() => {
  ioCallback = null;
  rafId = 0;
  rafSpy.mockClear();
  cafSpy.mockClear();
  mockObserve.mockClear();
  mockDisconnect.mockClear();

  global.IntersectionObserver = vi.fn((cb: IOCallback) => {
    ioCallback = cb;
    return {
      observe: mockObserve,
      unobserve: vi.fn(),
      disconnect: mockDisconnect,
      root: null,
      rootMargin: "",
      thresholds: [],
      takeRecords: () => [],
    } as unknown as IntersectionObserver;
  }) as unknown as typeof IntersectionObserver;

  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    mockCtx as unknown as CanvasRenderingContext2D,
  );
});

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

  it("observes canvas with IntersectionObserver and starts rAF on mount", () => {
    render(
      <I18nProvider>
        <HeroBanner />
      </I18nProvider>,
    );
    expect(mockObserve).toHaveBeenCalledTimes(1);
    expect(rafSpy).toHaveBeenCalled();
  });

  it("stops rAF when canvas scrolls out of viewport", () => {
    render(
      <I18nProvider>
        <HeroBanner />
      </I18nProvider>,
    );
    cafSpy.mockClear();

    ioCallback?.([
      { isIntersecting: false } as Partial<IntersectionObserverEntry>,
    ]);
    expect(cafSpy).toHaveBeenCalled();
  });
});
