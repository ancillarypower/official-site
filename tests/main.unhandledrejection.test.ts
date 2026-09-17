import { describe, it, expect, vi, beforeAll } from "vitest";

// Mock all main.tsx dependencies before side-effect import
vi.mock("react-dom/client", () => ({
  createRoot: vi.fn(() => ({ render: vi.fn() })),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
  Toaster: () => null,
}));

vi.mock("@tanstack/react-query", () => ({
  QueryClient: vi.fn(() => ({})),
  QueryClientProvider: ({ children }: { children: unknown }) => children,
}));

vi.mock("react-router-dom", () => ({
  BrowserRouter: ({ children }: { children: unknown }) => children,
}));

vi.mock("@/context/I18nContext", () => ({
  I18nProvider: ({ children }: { children: unknown }) => children,
}));

vi.mock("@/App", () => ({
  default: () => null,
}));

vi.mock("@/index.css", () => ({}));

describe("unhandledrejection handler (Issue #99)", () => {
  beforeAll(async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await import("../src/main");
  });

  it("calls toast.error on unhandled promise rejection", async () => {
    const { toast } = await import("sonner");

    const event = new Event("unhandledrejection") as Event & {
      reason: Error;
      promise: Promise<unknown>;
    };
    Object.defineProperty(event, "reason", {
      value: new Error("async failure"),
    });
    Object.defineProperty(event, "promise", {
      value: Promise.resolve(),
    });
    window.dispatchEvent(event);

    expect(toast.error).toHaveBeenCalled();
  });
});
