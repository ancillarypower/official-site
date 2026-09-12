import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/context/I18nContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSettingsStore } from "@/stores/settingsStore";

const mockPosts = [
  { id: 1, title: "Post Alpha", date: "2026-06-01T00:00:00", name: "post-alpha" },
  { id: 2, title: "Post Beta", date: "2026-01-01T00:00:00", name: "post-beta" },
  { id: 3, title: "Gamma Article", date: "2026-03-15T00:00:00", name: "gamma" },
];

const { mockUseWordPress } = vi.hoisted(() => ({
  mockUseWordPress: vi.fn(),
}));

vi.mock("@/hooks/useWordPress", () => ({
  useWordPress: (...args: unknown[]) => mockUseWordPress(...args),
  normalizeRawPost: vi.fn((p: Record<string, unknown>) => p),
}));

import ContentPage from "@/pages/ContentPage";

function renderPage(route = "/") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>
        <I18nProvider>
          <ContentPage />
        </I18nProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("ContentPage", () => {
  beforeEach(() => {
    useSettingsStore.setState({ contentType: "posts" });
    mockUseWordPress.mockReturnValue({
      data: { posts: mockPosts, totalPages: 2, totalPosts: 3 },
      isLoading: false,
      error: null,
    });
  });

  it("renders posts list", () => {
    renderPage();
    expect(screen.getByText("Post Alpha")).toBeInTheDocument();
    expect(screen.getByText("Post Beta")).toBeInTheDocument();
    expect(screen.getByText("Gamma Article")).toBeInTheDocument();
  });

  it("shows loading spinner", () => {
    mockUseWordPress.mockReturnValue({ data: undefined, isLoading: true, error: null });
    renderPage();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows error state", () => {
    mockUseWordPress.mockReturnValue({ data: undefined, isLoading: false, error: new Error("API Error") });
    renderPage();
    expect(screen.getByText("API Error")).toBeInTheDocument();
  });

  it("filters posts by search", () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText("\u641C\u5C0B..."), { target: { value: "gamma" } });
    expect(screen.getByText("Gamma Article")).toBeInTheDocument();
    expect(screen.queryByText("Post Alpha")).toBeNull();
  });

  it("renders pagination", () => {
    renderPage();
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("shows empty state when posts array is empty", () => {
    mockUseWordPress.mockReturnValue({
      data: { posts: [], totalPages: 0, totalPosts: 0 },
      isLoading: false,
      error: null,
    });
    renderPage();
    expect(screen.queryByText("Post Alpha")).not.toBeInTheDocument();
    expect(screen.getByText("\uD83D\uDCED")).toBeInTheDocument();
  });

  it("renders content type label from settings", () => {
    renderPage();
    expect(screen.getByText("\u6587\u7AE0")).toBeInTheDocument();
  });

  it("shows total items count", () => {
    renderPage();
    expect(screen.getByText("\u5171 3 \u9805")).toBeInTheDocument();
  });

  it("renders article view when article param is present", () => {
    renderPage("/?article=0");
    expect(screen.queryByText("1/2")).not.toBeInTheDocument();
    expect(screen.getByText("Post Alpha")).toBeInTheDocument();
  });
});
