import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
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
    mockUseWordPress.mockClear();
    useSettingsStore.setState({ contentType: "posts", perPage: 20 });
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

  it("sorts by title ascending", () => {
    renderPage();
    const sortSelect = screen.getByRole("combobox", { name: "Sort by" });
    fireEvent.change(sortSelect, { target: { value: "title_asc" } });
    expect(screen.getByText("Gamma Article")).toBeInTheDocument();
  });

  it("sorts by title descending", () => {
    renderPage();
    const sortSelect = screen.getByRole("combobox", { name: "Sort by" });
    fireEvent.change(sortSelect, { target: { value: "title_desc" } });
    expect(screen.getByText("Post Beta")).toBeInTheDocument();
  });

  it("sorts by date ascending", () => {
    renderPage();
    const sortSelect = screen.getByRole("combobox", { name: "Sort by" });
    fireEvent.change(sortSelect, { target: { value: "date_asc" } });
    expect(screen.getByText("Post Beta")).toBeInTheDocument();
  });

  it("renders article view when article param matches a post id", () => {
    renderPage("/?article=1");
    expect(screen.queryByText("1/2")).not.toBeInTheDocument();
  });

  it("selects post by id, not array index", () => {
    renderPage("/?article=3");
    expect(screen.queryByText("1/2")).not.toBeInTheDocument();
  });

  it("falls back to list when article id does not exist", () => {
    renderPage("/?article=999");
    expect(screen.getByText("1/2")).toBeInTheDocument();
    expect(screen.getByText("Post Alpha")).toBeInTheDocument();
  });

  it("navigates to article view on card click", () => {
    renderPage();
    fireEvent.click(screen.getByText("Post Alpha"));
    expect(screen.queryByText("1/2")).not.toBeInTheDocument();
  });

  it("shows empty state when no posts", () => {
    mockUseWordPress.mockReturnValue({
      data: { posts: [], totalPages: 0, totalPosts: 0 },
      isLoading: false,
      error: null,
    });
    renderPage();
    expect(screen.queryByText("Post Alpha")).not.toBeInTheDocument();
  });

  // --- Pagination URL sync regression tests ---

  it("reads page from URL and passes to useWordPress", () => {
    renderPage("/?page=2");
    expect(mockUseWordPress).toHaveBeenCalledWith(2);
  });

  it("defaults to page 1 when page param is missing", () => {
    renderPage("/");
    expect(mockUseWordPress).toHaveBeenCalledWith(1);
  });

  it("defaults to page 1 for non-numeric page param", () => {
    renderPage("/?page=abc");
    expect(mockUseWordPress).toHaveBeenCalledWith(1);
  });

  it("floors fractional page param", () => {
    renderPage("/?page=2.9");
    expect(mockUseWordPress).toHaveBeenCalledWith(2);
  });

  it("clamps zero and negative page to 1", () => {
    renderPage("/?page=0");
    expect(mockUseWordPress).toHaveBeenCalledWith(1);
  });

  it("preserves page param when selecting an article", () => {
    renderPage("/?page=2");
    fireEvent.click(screen.getByText("Post Alpha"));
    expect(mockUseWordPress).toHaveBeenCalledWith(2);
  });

  // --- Pagination reset on settings change regression tests ---

  it("resets page when contentType changes", () => {
    renderPage("/?page=3");
    expect(mockUseWordPress).toHaveBeenCalledWith(3);
    act(() => {
      useSettingsStore.setState({ contentType: "categories" });
    });
    expect(mockUseWordPress).toHaveBeenLastCalledWith(1);
  });

  it("resets page when perPage changes", () => {
    renderPage("/?page=3");
    expect(mockUseWordPress).toHaveBeenCalledWith(3);
    act(() => {
      useSettingsStore.setState({ perPage: 50 });
    });
    expect(mockUseWordPress).toHaveBeenLastCalledWith(1);
  });

  it("does not reset page on initial mount", () => {
    renderPage("/?page=3");
    expect(mockUseWordPress).toHaveBeenCalledWith(3);
    expect(mockUseWordPress).not.toHaveBeenCalledWith(1);
  });
});
