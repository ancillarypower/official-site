import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/context/I18nContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "@/App";

// Mock Three.js modules to prevent WebGL issues in jsdom
vi.mock("three", () => ({}));
vi.mock("three/examples/jsm/controls/OrbitControls.js", () => ({}));
vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({}));
vi.mock("three/examples/jsm/loaders/DRACOLoader.js", () => ({}));
vi.mock("three/examples/jsm/loaders/OBJLoader.js", () => ({}));
vi.mock("three/examples/jsm/loaders/STLLoader.js", () => ({}));
vi.mock("three/examples/jsm/environments/RoomEnvironment.js", () => ({}));

// Mock fetch globally for WordPress API calls
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  headers: new Headers({ "X-WP-TotalPages": "1", "X-WP-Total": "0" }),
  json: async () => [],
});

function renderApp(initialRoute = "/") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <I18nProvider>
          <App />
        </I18nProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("App", () => {
  it("renders navbar and footer", async () => {
    renderApp();
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/WP \u5167\u5BB9/)).toBeInTheDocument();
    });
  });

  it("renders SkipToContent link", () => {
    renderApp();
    expect(screen.getByText("Skip to content")).toBeInTheDocument();
  });

  it("renders main content area", () => {
    renderApp();
    expect(document.getElementById("main-content")).toBeInTheDocument();
  });

  it("renders about page on /about route", async () => {
    renderApp("/about");
    await waitFor(() => {
      expect(screen.getByText(/\u95DC\u65BC\u5B89\u745F\u6A02\u5A01/)).toBeInTheDocument();
    });
  });

  it("redirects unknown routes to /", async () => {
    renderApp("/nonexistent");
    await waitFor(() => {
      expect(document.getElementById("main-content")).toBeInTheDocument();
    });
  });
});
