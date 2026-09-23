import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

const { mockUseWordPress, mockUseSinglePost } = vi.hoisted(() => ({
  mockUseWordPress: vi.fn(),
  mockUseSinglePost: vi.fn(),
}));

vi.mock("@/hooks/useWordPress", () => ({
  useWordPress: (...args: unknown[]) => mockUseWordPress(...args),
  useSinglePost: (...args: unknown[]) => mockUseSinglePost(...args),
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
    mockUseSinglePost.mockClear();
    useSettingsStore.setState({ contentType: "posts", perPage: 20 });
    mockUseWordPress.mockReturnValue({
      data: { posts: mockPosts, totalPages: 2, totalPosts: 3 },
      isLoading: false,
      isFetching: false,
      isPlaceholderData: false,
      error: null,
      refetch: vi.fn(),
    });
    // Default: useSinglePost disabled / no data
    mockUseSinglePost.mockReturnValue({
      data: undefined,
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
    mockUseWordPress.mockReturnValue({ data: undefined, isLoading: true, isFetching: true, isPlaceholderData: false, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows friendly error state instead of raw error message", () => {
    mockUseWordPress.mockReturnValue({ data: undefined, isLoading: false, isFetching: false, isPlaceholderData: false, error: new Error("HTTP 500"), refetch: vi.fn() });
    renderPage();
    expect(screen.getByText("\u4f3a\u670d\u5668\u56de\u61c9\u932f\u8aa4\uff08HTTP 500\uff09")).toBeInTheDocument();
    expect(screen.getByText("\u91cd\u8a66")).toBeInTheDocument();
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
    expect(mockUseWordPress).toHaveBeenLastCalledWith(1, "", "title", "asc", [], true);
  });

  it("sorts by title descending", () => {
    renderPage();
    const sortSelect = screen.getByRole("combobox", { name: "Sort by" });
    fireEvent.change(sortSelect, { target: { value: "title_desc" } });
    expect(screen.getByText("Post Beta")).toBeInTheDocument();
    expect(mockUseWordPress).toHaveBeenLastCalledWith(1, "", "title", "desc", [], true);
  });

  it("sorts by date ascending", () => {
    renderPage();
    const sortSelect = screen.getByRole("combobox", { name: "Sort by" });
    fireEvent.change(sortSelect, { target: { value: "date_asc" } });
    expect(screen.getByText("Post Beta")).toBeInTheDocument();
    expect(mockUseWordPress).toHaveBeenLastCalledWith(1, "", "date", "asc", [], true);
  });

  it("renders article view when article param matches a post id", () => {
    renderPage("/?article=1");
    expect(screen.queryByText("1/2")).not.toBeInTheDocument();
  });

  it("selects post by id, not array index", () => {
    renderPage("/?article=3");
    expect(screen.queryByText("1/2")).not.toBeInTheDocument();
  });

  it("shows not-found state when article id does not exist on any page (regression #250)", () => {
    mockUseSinglePost.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });
    renderPage("/?article=999");
    expect(screen.queryByText("1/2")).not.toBeInTheDocument();
    expect(screen.queryByText("Post Alpha")).not.toBeInTheDocument();
  });

  it("fetches single post from API when not on current page (regression #250)", () => {
    mockUseSinglePost.mockReturnValue({
      data: { id: 42, title: "Remote Post", date: "2026-08-01T00:00:00", name: "remote-post" },
      isLoading: false,
      error: null,
    });
    renderPage("/?article=42");
    expect(screen.queryByText("1/2")).not.toBeInTheDocument();
    expect(mockUseSinglePost).toHaveBeenCalledWith(42);
  });

  it("shows loading spinner while fetching single post for deep link (regression #250)", () => {
    mockUseSinglePost.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    renderPage("/?article=42");
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows error state with correct retry when deep-linked article fetch fails (regression #449)", () => {
    const mockRefetchSingle = vi.fn();
    const mockListRefetch = vi.fn();
    mockUseWordPress.mockReturnValue({
      data: { posts: mockPosts, totalPages: 2, totalPosts: 3 },
      isLoading: false,
      isFetching: false,
      isPlaceholderData: false,
      error: null,
      refetch: mockListRefetch,
    });
    mockUseSinglePost.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Network error"),
      refetch: mockRefetchSingle,
    });
    renderPage("/?article=999");
    expect(screen.getByText("\u91cd\u8a66")).toBeInTheDocument();
    fireEvent.click(screen.getByText("\u91cd\u8a66"));
    expect(mockRefetchSingle).toHaveBeenCalled();
    expect(mockListRefetch).not.toHaveBeenCalled();
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
      isFetching: false,
      isPlaceholderData: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();
    expect(screen.queryByText("Post Alpha")).not.toBeInTheDocument();
  });

  // --- Pagination URL sync regression tests ---

  it("reads page from URL and passes to useWordPress", () => {
    renderPage("/?page=2");
    expect(mockUseWordPress).toHaveBeenCalledWith(2, "", "date", "desc", [], true);
  });

  it("defaults to page 1 when page param is missing", () => {
    renderPage("/");
    expect(mockUseWordPress).toHaveBeenCalledWith(1, "", "date", "desc", [], true);
  });

  it("defaults to page 1 for non-numeric page param", () => {
    renderPage("/?page=abc");
    expect(mockUseWordPress).toHaveBeenCalledWith(1, "", "date", "desc", [], true);
  });

  it("floors fractional page param", () => {
    renderPage("/?page=2.9");
    expect(mockUseWordPress).toHaveBeenCalledWith(2, "", "date", "desc", [], true);
  });

  it("clamps zero and negative page to 1", () => {
    renderPage("/?page=0");
    expect(mockUseWordPress).toHaveBeenCalledWith(1, "", "date", "desc", [], true);
  });

  it("preserves page param when selecting an article", () => {
    renderPage("/?page=2");
    fireEvent.click(screen.getByText("Post Alpha"));
    expect(mockUseWordPress).toHaveBeenCalledWith(2, "", "date", "desc", [], true);
  });

  // --- Pagination reset on settings change regression tests ---

  it("resets page when contentType changes", () => {
    renderPage("/?page=3");
    expect(mockUseWordPress).toHaveBeenCalledWith(3, "", "date", "desc", [], true);
    act(() => {
      useSettingsStore.setState({ contentType: "categories" });
    });
    expect(mockUseWordPress).toHaveBeenLastCalledWith(1, "", "date", "desc", [], true);
  });

  it("resets page when perPage changes", () => {
    renderPage("/?page=3");
    expect(mockUseWordPress).toHaveBeenCalledWith(3, "", "date", "desc", [], true);
    act(() => {
      useSettingsStore.setState({ perPage: 50 });
    });
    expect(mockUseWordPress).toHaveBeenLastCalledWith(1, "", "date", "desc", [], true);
  });

  it("does not reset page on initial mount", () => {
    renderPage("/?page=3");
    expect(mockUseWordPress).toHaveBeenCalledWith(3, "", "date", "desc", [], true);
    expect(mockUseWordPress).not.toHaveBeenCalledWith(1, "", "date", "desc", [], true);
  });

  // --- Pagination reset on wpUrl change regression tests (#144) ---

  it("resets page when wpUrl changes (regression #144)", () => {
    useSettingsStore.setState({ wpUrl: "https://old.example.com" });
    renderPage("/?page=3");
    expect(mockUseWordPress).toHaveBeenCalledWith(3, "", "date", "desc", [], true);
    act(() => {
      useSettingsStore.setState({ wpUrl: "https://new.example.com" });
    });
    expect(mockUseWordPress).toHaveBeenLastCalledWith(1, "", "date", "desc", [], true);
  });

  it("resets filter and sort when wpUrl changes (regression #144)", () => {
    useSettingsStore.setState({ wpUrl: "https://old.example.com" });
    renderPage();
    const searchInput = screen.getByPlaceholderText("\u641C\u5C0B...");
    const sortSelect = screen.getByRole("combobox", { name: "Sort by" });
    fireEvent.change(searchInput, { target: { value: "energy" } });
    fireEvent.change(sortSelect, { target: { value: "title_asc" } });
    expect(searchInput).toHaveValue("energy");
    expect(sortSelect).toHaveValue("title_asc");
    act(() => {
      useSettingsStore.setState({ wpUrl: "https://new.example.com" });
    });
    expect(searchInput).toHaveValue("");
    expect(sortSelect).toHaveValue("date_desc");
  });

  // --- Filter/sort reset on contentType change regression tests (#123) ---

  it("resets filter when contentType changes (regression #123)", () => {
    renderPage();
    const searchInput = screen.getByPlaceholderText("\u641C\u5C0B...");
    fireEvent.change(searchInput, { target: { value: "WordPress" } });
    expect(searchInput).toHaveValue("WordPress");
    act(() => {
      useSettingsStore.setState({ contentType: "categories" });
    });
    expect(searchInput).toHaveValue("");
  });

  it("resets sort when contentType changes (regression #123)", () => {
    renderPage();
    const sortSelect = screen.getByRole("combobox", { name: "Sort by" });
    fireEvent.change(sortSelect, { target: { value: "title_asc" } });
    expect(sortSelect).toHaveValue("title_asc");
    act(() => {
      useSettingsStore.setState({ contentType: "categories" });
    });
    expect(sortSelect).toHaveValue("date_desc");
  });

  it("does not reset filter/sort when perPage changes (regression #123)", () => {
    renderPage();
    const searchInput = screen.getByPlaceholderText("\u641C\u5C0B...");
    const sortSelect = screen.getByRole("combobox", { name: "Sort by" });
    fireEvent.change(searchInput, { target: { value: "energy" } });
    fireEvent.change(sortSelect, { target: { value: "title_desc" } });
    expect(searchInput).toHaveValue("energy");
    expect(sortSelect).toHaveValue("title_desc");
    act(() => {
      useSettingsStore.setState({ perPage: 50 });
    });
    expect(searchInput).toHaveValue("energy");
    expect(sortSelect).toHaveValue("title_desc");
  });

  // --- Filter/sort URL sync regression tests (#127) ---

  it("reads filter and sort from URL search params on mount (regression #127)", () => {
    renderPage("/?q=energy&sort=title_asc");
    const searchInput = screen.getByPlaceholderText("\u641C\u5C0B...");
    const sortSelect = screen.getByRole("combobox", { name: "Sort by" });
    expect(searchInput).toHaveValue("energy");
    expect(sortSelect).toHaveValue("title_asc");
  });

  it("preserves filter/sort in URL when navigating to article and back (regression #127)", () => {
    renderPage("/?q=Post&sort=title_asc");
    expect(screen.getByPlaceholderText("\u641C\u5C0B...")).toHaveValue("Post");
    expect(screen.getByRole("combobox", { name: "Sort by" })).toHaveValue("title_asc");
    fireEvent.click(screen.getByText("Post Alpha"));
    expect(screen.queryByText("1/2")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/\u2190/));
    expect(screen.getByPlaceholderText("\u641C\u5C0B...")).toHaveValue("Post");
    expect(screen.getByRole("combobox", { name: "Sort by" })).toHaveValue("title_asc");
  });

  it("filter and sort survive remount via URL params (regression #127)", () => {
    const { unmount } = renderPage("/?q=energy&sort=title_asc");
    expect(screen.getByPlaceholderText("\u641C\u5C0B...")).toHaveValue("energy");
    expect(screen.getByRole("combobox", { name: "Sort by" })).toHaveValue("title_asc");
    unmount();
    renderPage("/?q=energy&sort=title_asc");
    expect(screen.getByPlaceholderText("\u641C\u5C0B...")).toHaveValue("energy");
    expect(screen.getByRole("combobox", { name: "Sort by" })).toHaveValue("title_asc");
  });

  // --- Server-side search delegation tests ---

  describe("search delegation", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("delegates search to WordPress REST API via debounced query", () => {
      renderPage();
      expect(mockUseWordPress).toHaveBeenCalledWith(1, "", "date", "desc", [], true);
      fireEvent.change(screen.getByPlaceholderText("\u641C\u5C0B..."), { target: { value: "gamma" } });
      expect(mockUseWordPress).toHaveBeenLastCalledWith(1, "", "date", "desc", [], true);
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(mockUseWordPress).toHaveBeenLastCalledWith(1, "gamma", "date", "desc", [], true);
    });

    it("does not pass search to API before debounce delay", () => {
      renderPage();
      fireEvent.change(screen.getByPlaceholderText("\u641C\u5C0B..."), { target: { value: "test" } });
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(mockUseWordPress).not.toHaveBeenCalledWith(expect.anything(), "test", expect.anything(), expect.anything(), expect.anything(), expect.anything());
    });

    it("resets page to 1 when search input changes", () => {
      renderPage("/?page=3");
      expect(mockUseWordPress).toHaveBeenCalledWith(3, "", "date", "desc", [], true);
      fireEvent.change(screen.getByPlaceholderText("\u641C\u5C0B..."), { target: { value: "energy" } });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(mockUseWordPress).toHaveBeenLastCalledWith(1, "energy", "date", "desc", [], true);
    });
  });

  // --- Server-side sort delegation regression tests (#276) ---

  it("delegates sorting to WordPress REST API via orderby/order parameters (regression #276)", () => {
    renderPage();
    expect(mockUseWordPress).toHaveBeenCalledWith(1, "", "date", "desc", [], true);
    const sortSelect = screen.getByRole("combobox", { name: "Sort by" });
    fireEvent.change(sortSelect, { target: { value: "title_asc" } });
    expect(mockUseWordPress).toHaveBeenLastCalledWith(1, "", "title", "asc", [], true);
  });

  it("resets sort params to default when contentType changes (regression #276)", () => {
    renderPage();
    const sortSelect = screen.getByRole("combobox", { name: "Sort by" });
    fireEvent.change(sortSelect, { target: { value: "title_asc" } });
    expect(mockUseWordPress).toHaveBeenLastCalledWith(1, "", "title", "asc", [], true);
    act(() => {
      useSettingsStore.setState({ contentType: "categories" });
    });
    expect(mockUseWordPress).toHaveBeenLastCalledWith(1, "", "date", "desc", [], true);
  });

  it("preserves sort params in URL across article navigation (regression #276)", () => {
    renderPage("/?sort=title_desc");
    expect(mockUseWordPress).toHaveBeenCalledWith(1, "", "title", "desc", [], true);
    fireEvent.click(screen.getByText("Post Alpha"));
    expect(screen.queryByText("1/2")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/\u2190/));
    expect(mockUseWordPress).toHaveBeenLastCalledWith(1, "", "title", "desc", [], true);
  });

  // --- _fields bandwidth optimization regression tests (#277) ---

  it("always fetches full post via useSinglePost for article view (regression #277)", () => {
    renderPage("/?article=1");
    expect(mockUseSinglePost).toHaveBeenCalledWith(1);
  });

  it("renders article preview from list data while useSinglePost loads (regression #277)", () => {
    mockUseSinglePost.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    renderPage("/?article=1");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText("1/2")).not.toBeInTheDocument();
  });

  // --- Skip list query when viewing article regression tests (#437) ---

  it("disables list query when article param is set (regression #437)", () => {
    renderPage("/?article=1");
    expect(mockUseWordPress).toHaveBeenCalledWith(
      expect.any(Number), expect.any(String), expect.any(String), expect.any(String), expect.any(Array), false,
    );
  });

  it("enables list query when no article param (regression #437)", () => {
    renderPage("/");
    expect(mockUseWordPress).toHaveBeenCalledWith(1, "", "date", "desc", [], true);
  });

  // --- Focus management regression tests (#149) ---

  it("focuses #main-content when returning from article view (regression #149)", () => {
    const mainEl = document.createElement("main");
    mainEl.id = "main-content";
    document.body.appendChild(mainEl);

    try {
      renderPage("/?article=1");
      expect(screen.queryByText("1/2")).not.toBeInTheDocument();
      fireEvent.click(screen.getByText(/\u2190/));
      expect(mainEl).toHaveFocus();
      expect(mainEl.getAttribute("tabindex")).toBe("-1");
    } finally {
      document.body.removeChild(mainEl);
    }
  });
});
