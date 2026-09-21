/// <reference types="vitest/globals" />
import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";

// Mock matchMedia for tests
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver (jsdom does not provide it) (#203)
global.IntersectionObserver = vi.fn().mockImplementation(
  (callback: IntersectionObserverCallback) => {
    // Auto-trigger with isIntersecting: true so components that gate
    // initialization on visibility work in tests by default.
    const instance = {
      observe: vi.fn().mockImplementation(() => {
        setTimeout(() => callback([{ isIntersecting: true } as IntersectionObserverEntry], instance as unknown as IntersectionObserver), 0);
      }),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
      takeRecords: vi.fn().mockReturnValue([]),
      root: null,
      rootMargin: "",
      thresholds: [0],
    };
    return instance;
  },
) as unknown as typeof IntersectionObserver;

// Mock import.meta.env
vi.stubEnv("VITE_WP_URL", "https://test.example.com");
vi.stubEnv("VITE_WOO_KEY", "");
vi.stubEnv("VITE_WOO_SECRET", "");

// Default navigator.language to zh-TW so I18nProvider defaults to Chinese
// in all tests. Individual tests can override via Object.defineProperty.
// jsdom defaults to "en-US" which would flip the default after #141 fix.
Object.defineProperty(navigator, "language", {
  value: "zh-TW",
  configurable: true,
});

// Clear localStorage between tests to prevent Zustand persist cross-test contamination
afterEach(() => {
  localStorage.clear();
});
