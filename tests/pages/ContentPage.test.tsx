import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/context/I18nContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSettingsStore } from "@/stores/settingsStore";

// Mock useWordPress hook
const mockPosts = [
  { id: 1, title: "Post Alpha", date: "2026-06-01T00:00:00", name: "post-alpha" },
  { id: 2, title: "Post Beta", date: "2026-01-01T00:00:00", name: "post-beta" },
  { id: 3, title: "Gamma Article", date: "2026-03-15T00:00:00", name: "gamma" },
];

let mockReturn: { data: unknown; isLoading: boolean; error: unknown } = {
  data: { posts: mockPosts, totalPages: 2, totalPosts: 3 },
  isLoading: false,
  error: null,
};

vi.mock("@/hooks/useWordPress", () => ({
  useWordPress: () => mockReturn,
  normalizeRawPost: vi.fn(),
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
    mockReturn = {
      data: { posts: mockPosts, totalPages: 2, totalPosts: 3 },
      isLoading: false,
      error: null,
    };
  });

  it("renders posts list", () => {
    renderPage();
    expect(screen.getByText("Post Alpha")).toBeInTheDocument();
    expect(screen.getByText("Post Beta")).toBeInTheDocument();
    expect(screen.getByText("Gamma Article")).toBeInTheDocument();
  });

  it("displays content type and total count", () => {
    renderPage();
    expect(screen.getByText("\u6587\u7AE0")).toBeInTheDocument();
    expect(screen.getByText("\u5171 3 \u9805")).toBeInTheDocument();
  });

  it("shows loading spinner when loading", () => {
    mockReturn = { data: null, isLoading: true, error: null };
    renderPage();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows error state", () => {
    mockReturn = { data: null, isLoading: false, error: new Error("API Error") };
    renderPage();
    expect(screen.getByText("API Error")).toBeInTheDocument();
  });

  it("shows empty state when no posts", () => {
    mockReturn = { data: { posts: [], totalPages: 0, totalPosts: 0 }, isLoading: false, error: null };
    renderPage();
    expect(screen.getByText("\u6C92\u6709\u7D50\u679C")).toBeInTheDocument();
  });

  it("filters posts by search text", () => {
    renderPage();
    const searchInput = screen.getByPlaceholderText("\u641C\u5C0B...");
    fireEvent.change(searchInput, { target: { value: "gamma" } });
    expect(screen.getByText("Gamma Article")).toBeInTheDocument();
    expect(screen.queryByText("Post Alpha")).toBeNull();
  });

  it("renders article view when article param is set", () => {
    renderPage("/?article=0");
    expect(screen.getByText("Post Alpha")).toBeInTheDocument();
    expect(screen.getByText(/\u8fd4\u56de\u5217\u8868/)).toBeInTheDocument();
  });

  it("renders pagination", () => {
    renderPage();
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });
});
