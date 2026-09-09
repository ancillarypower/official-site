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

// Mock import.meta.env
vi.stubEnv("VITE_WP_URL", "https://test.example.com");
vi.stubEnv("VITE_WOO_KEY", "");
vi.stubEnv("VITE_WOO_SECRET", "");
