import { useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useWordPress, useSinglePost } from "@/hooks/useWordPress";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useI18n } from "@/context/I18nContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useSettingsStore } from "@/stores/settingsStore";
import { PostGrid } from "@/components/content/PostGrid";
import { ArticleView } from "@/components/content/ArticleView";
import { Pagination } from "@/components/ui/Pagination";
import { ContentToolbar } from "@/components/ui/ContentToolbar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { FetchErrorState } from "@/components/ui/FetchErrorState";

const SORT_OPTIONS = [
  { value: "date_desc", labelKey: "sort_date_desc" },
  { value: "date_asc", labelKey: "sort_date_asc" },
  { value: "title_asc", labelKey: "sort_title_asc" },
  { value: "title_desc", labelKey: "sort_title_desc" },
];

/** Default sort parameters matching WordPress REST API defaults. */
const DEFAULT_SORT = { orderby: "date", order: "desc" } as const;

/** Map UI sort values to WordPress REST API orderby/order parameters. */
const SORT_MAP: Record<string, { orderby: string; order: string }> = {
  date_desc: { orderby: "date", order: "desc" },
  date_asc: { orderby: "date", order: "asc" },
  title_asc: { orderby: "title", order: "asc" },
  title_desc: { orderby: "title", order: "desc" },
};

function parsePageParam(value: string | null): number {
  const raw = Number(value);
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
}

export default function ContentPage() {
  const { t } = useI18n();
  useDocumentTitle(t("nav_content"));
  const contentType = useSettingsStore((s) => s.contentType);
  const perPage = useSettingsStore((s) => s.perPage);
  const wpUrl = useSettingsStore((s) => s.wpUrl);
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePageParam(searchParams.get("page"));
  const articleParam = searchParams.get("article");
  const articleId =
    articleParam !== null && /^\d+$/.test(articleParam)
      ? Number(articleParam)
      : null;

  // Sync filter and sort to URL search params so they survive navigation
  // and browser refresh (#127). Default values are omitted from URL.
  const filter = searchParams.get("q") ?? "";
  const sort = searchParams.get("sort") ?? "date_desc";

  const setFilter = useCallback((value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set("q", value);
      else next.delete("q");
      next.delete("page");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setSort = useCallback((value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value && value !== "date_desc") next.set("sort", value);
      else next.delete("sort");
      next.delete("page");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Debounce search input before sending to WordPress REST API (300 ms).
  const debouncedSearch = useDebouncedValue(filter, 300);

  // Reset page to 1 when contentType, perPage, or wpUrl changes (not on mount).
  // Also reset filter and sort when contentType or wpUrl changes (#123, #127, #144).
  // Switching wpUrl is equivalent to switching data sources, so all view state resets.
  // usePrevious ref pattern: mount -> refs === current -> skip; value change ->
  // refs !== current -> reset page. StrictMode-safe (no ref-flip-during-render).
  const prevContentType = useRef(contentType);
  const prevPerPage = useRef(perPage);
  const prevWpUrl = useRef(wpUrl);

  useEffect(() => {
    const contentTypeChanged = prevContentType.current !== contentType;
    const perPageChanged = prevPerPage.current !== perPage;
    const wpUrlChanged = prevWpUrl.current !== wpUrl;
    if (contentTypeChanged || perPageChanged || wpUrlChanged) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete("page");
        if (contentTypeChanged || wpUrlChanged) {
          next.delete("q");
          next.delete("sort");
        }
        return next;
      }, { replace: true });
    }
    prevContentType.current = contentType;
    prevPerPage.current = perPage;
    prevWpUrl.current = wpUrl;
  }, [contentType, perPage, wpUrl, setSearchParams]);

  // Focus #main-content when returning from article detail view to list (#149).
  // Tracks previous articleId: when it transitions from non-null to null,
  // the user navigated back from ArticleView and the back button is gone.
  const prevArticleIdRef = useRef(articleId);
  useEffect(() => {
    const wasInArticle = prevArticleIdRef.current !== null;
    const nowInList = articleId === null;
    if (wasInArticle && nowInList) {
      const main = document.getElementById("main-content");
      if (main) {
        main.setAttribute("tabindex", "-1");
        main.focus({ preventScroll: true });
      }
    }
    prevArticleIdRef.current = articleId;
  }, [articleId]);

  const setPage = (p: number) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (p === 1) next.delete("page");
      else next.set("page", String(p));
      return next;
    }, { replace: true });
  };

  // Delegate sorting to WordPress REST API (Issue #276).
  // Client-side sorting only affected the current page; server-side sorting
  // ensures cross-page consistency.
  // Literal DEFAULT_SORT fallback avoids noUncheckedIndexedAccess union with undefined.
  const sortParams = SORT_MAP[sort] ?? DEFAULT_SORT;
  const { data, isLoading, isFetching, isPlaceholderData, error, refetch } = useWordPress(
    page,
    debouncedSearch,
    sortParams.orderby,
    sortParams.order,
  );

  // Posts are already sorted by the API; no client-side re-sorting needed.
  const posts = data?.posts ?? [];

  // Deep link resolution (Issue #250):
  // 1. Try to find the post on the currently loaded page (instant, no API call).
  // 2. If not found AND the list query has finished loading, fetch the single
  //    post directly from the WP REST API via useSinglePost.
  const localMatch =
    articleId !== null ? data?.posts.find((p) => p.id === articleId) : undefined;

  const shouldFetchSingle =
    articleId !== null && !isLoading && data !== undefined && !localMatch;

  const {
    data: remoteSinglePost,
    isLoading: isSinglePostLoading,
    error: singlePostError,
  } = useSinglePost(shouldFetchSingle ? articleId : null);

  const selectedPost = localMatch ?? remoteSinglePost ?? undefined;

  // Article deep link: loading state while fetching single post
  if (articleId !== null && shouldFetchSingle && isSinglePostLoading) {
    return <LoadingSpinner />;
  }

  // Article deep link: post not found (404) or fetch error
  if (articleId !== null && shouldFetchSingle && !selectedPost) {
    if (singlePostError) {
      return <FetchErrorState error={singlePostError} onRetry={refetch} />;
    }
    // remoteSinglePost === null means 404
    return <EmptyState icon="\ud83d\udced" title={t("no_results")} />;
  }

  if (selectedPost) {
    return (
      <ArticleView
        post={selectedPost}
        onBack={() => setSearchParams(prev => {
          const next = new URLSearchParams(prev);
          next.delete("article");
          return next;
        }, { replace: true })}
      />
    );
  }

  if (isLoading) return <LoadingSpinner />;
  if (error) return <FetchErrorState error={error} onRetry={refetch} />;
  if (!data?.posts.length) return <EmptyState icon="\ud83d\udced" title={t("no_results")} />;

  const typeLabel = t(`type_${contentType}` as const);

  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex items-baseline gap-3 border-b border-border-subtle pb-4">
        <h2 className="text-lg font-bold">{typeLabel}</h2>
        <span className="text-xs text-tertiary">
          {t("total_items", { n: data.totalPosts })}
        </span>
        {isFetching && isPlaceholderData && (
          <span className="text-xs text-tertiary animate-pulse">{t("loading")}</span>
        )}
      </div>
      <ContentToolbar
        filterValue={filter}
        onFilterChange={setFilter}
        sortValue={sort}
        onSortChange={setSort}
        sortOptions={SORT_OPTIONS}
      />
      <div className={isFetching && isPlaceholderData ? "opacity-50 transition-opacity" : "transition-opacity"}>
        <PostGrid
          posts={posts}
          onSelectPost={(i) => {
            const post = posts[i];
            if (post) setSearchParams(prev => {
              const next = new URLSearchParams(prev);
              next.set("article", String(post.id));
              return next;
            });
          }}
        />
      </div>
      <Pagination
        currentPage={page}
        totalPages={data.totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
