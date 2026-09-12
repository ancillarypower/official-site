import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/context/I18nContext";
import { createElement } from "react";

vi.mock("@/pages/ContentPage", () => ({
  default: () => createElement("div", { "data-testid": "content-page" }, "Content"),
}));
vi.mock("@/pages/ModelsPage", () => ({
  default: () => createElement("div", { "data-testid": "models-page" }, "Models"),
}));
vi.mock("@/pages/StorePage", () => ({
  default: () => createElement("div", { "data-testid": "store-page" }, "Store"),
}));
vi.mock("@/pages/AboutPage", () => ({
  default: () => createElement("div", { "data-testid": "about-page" }, "About"),
}));
vi.mock("@/pages/LegalPage", () => ({
  default: () => createElement("div", { "data-testid": "legal-page" }, "Legal"),
}));
vi.mock("@/components/layout/Sidebar", () => ({
  Sidebar: () => createElement("div", { "data-testid": "sidebar" }),
}));

import App from "@/App";

function renderApp(route = "/") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    createElement(
      QueryClientProvider,
      { client: qc },
      createElement(
        MemoryRouter,
        { initialEntries: [route] },
        createElement(I18nProvider, null, createElement(App))
      )
    )
  );
}

describe("App routing", () => {
  it("renders ContentPage at /", async () => {
    renderApp("/");
    await waitFor(() => expect(screen.getByTestId("content-page")).toBeInTheDocument());
  });

  it("renders ModelsPage at /models", async () => {
    renderApp("/models");
    await waitFor(() => expect(screen.getByTestId("models-page")).toBeInTheDocument());
  });

  it("renders StorePage at /store", async () => {
    renderApp("/store");
    await waitFor(() => expect(screen.getByTestId("store-page")).toBeInTheDocument());
  });

  it("renders AboutPage at /about", async () => {
    renderApp("/about");
    await waitFor(() => expect(screen.getByTestId("about-page")).toBeInTheDocument());
  });

  it("renders LegalPage at /legal", async () => {
    renderApp("/legal");
    await waitFor(() => expect(screen.getByTestId("legal-page")).toBeInTheDocument());
  });

  it("redirects unknown routes to /", async () => {
    renderApp("/nonexistent");
    await waitFor(() => expect(screen.getByTestId("content-page")).toBeInTheDocument());
  });

  it("renders Navbar with navigation", () => {
    renderApp("/");
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("renders SkipToContent link", () => {
    renderApp("/");
    expect(screen.getByText("Skip to content")).toBeInTheDocument();
  });

  it("renders mocked Sidebar", () => {
    renderApp("/");
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
  });

  it("renders footer element", () => {
    renderApp("/");
    const footer = document.querySelector("footer");
    expect(footer).toBeInTheDocument();
  });
});
