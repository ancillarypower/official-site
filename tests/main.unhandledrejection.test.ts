import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

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

function dispatchUnhandledRejection(): void {
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
}

describe("unhandledrejection handler (Issue #99)", () => {
  beforeAll(async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await import("../src/main");
  });

  it("calls toast.error on unhandled promise rejection", async () => {
    const { toast } = await import("sonner");

    dispatchUnhandledRejection();

    expect(toast.error).toHaveBeenCalled();
  });
});

describe("unhandledrejection language selection (regression #463)", () => {
  beforeAll(async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await import("../src/main");
  });

  beforeEach(async () => {
    const { toast } = await import("sonner");
    vi.mocked(toast.error).mockClear();
  });

  it("uses stored app language preference over browser language", async () => {
    const { toast } = await import("sonner");
    const { en } = await import("../src/i18n/en");

    // Browser is zh-TW, but app preference is English
    vi.spyOn(navigator, "language", "get").mockReturnValue("zh-TW");
    localStorage.setItem("ap-lang", "en");

    dispatchUnhandledRejection();

    expect(toast.error).toHaveBeenCalledWith(en.error_unhandled);

    localStorage.removeItem("ap-lang");
    vi.restoreAllMocks();
  });

  it("falls back to browser language when no stored preference", async () => {
    const { toast } = await import("sonner");
    const { zh } = await import("../src/i18n/zh");

    // No stored preference, browser is zh-TW → should use Chinese
    localStorage.removeItem("ap-lang");
    vi.spyOn(navigator, "language", "get").mockReturnValue("zh-TW");

    dispatchUnhandledRejection();

    expect(toast.error).toHaveBeenCalledWith(zh.error_unhandled);

    vi.restoreAllMocks();
  });
});
