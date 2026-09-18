import { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useWordPress } from "@/hooks/useWordPress";
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
import { getPostTitle } from "@/lib/types";

const SORT_OPTIONS = [
  { value: "date_desc", labelKey: "sort_date_desc" },
  { value: "date_asc", labelKey: "sort_date_asc" },
  { value: "title_asc", labelKey: "sort_title_asc" },
  { value: "title_desc", labelKey: "sort_title_desc" },
];

function parsePageParam(value: string | null): number {
  const raw = Number(value);
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
}

export default function ContentPage() {
  const { t } = useI18n();
  useDocumentTitle(t("nav_content"));
  const contentType = useSettingsStore((s) => s.contentType);
  const perPage = useSettingsStore((s) => s.perPage);
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePageParam(searchParams.get("page"));
  const articleParam = searchParams.get("article");
  const articleId =
    articleParam !== null && /^\d+$/.test(articleParam)
      ? Number(articleParam)
      : null;
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState("date_desc");

  // Debounce search input before sending to WordPress REST API (300 ms).
  const debouncedSearch = useDebouncedValue(filter, 300);

  // Reset page to 1 when contentType or perPage changes (not on mount).
  // Also reset filter and sort when contentType changes (#123).
  // usePrevious ref pattern: mount -> refs === current -> skip; value change ->
  // refs !== current -> reset page. StrictMode-safe (no ref-flip-during-render).
  const prevContentType = useRef(contentType);
  const prevPerPage = useRef(perPage);

  useEffect(() => {
    const contentTypeChanged = prevContentType.current !== contentType;
    const perPageChanged = prevPerPage.current !== perPage;
    if (contentTypeChanged || perPageChanged) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete("page");
        return next;
      }, { replace: true });
    }
    if (contentTypeChanged) {
      setFilter("");
      setSort("date_desc");
    }
    prevContentType.current = contentType;
    prevPerPage.current = perPage;
  }, [contentType, perPage, setSearchParams]);

  const setPage = (p: number) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (p === 1) next.delete("page");
      else next.set("page", String(p));
      return next;
    }, { replace: true });
  };

  const { data, isLoading, isFetching, isPlaceholderData, error, refetch } = useWordPress(page, debouncedSearch);

  // Client-side sort only; search is delegated to WP REST API `search` param.
  const filteredPosts = useMemo(() => {
    if (!data?.posts) return [];
    const posts = [...data.posts];
    switch (sort) {
      case "date_desc":
        posts.sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());
        break;
      case "date_asc":
        posts.sort((a, b) => new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime());
        break;
      case "title_asc":
        posts.sort((a, b) => getPostTitle(a).localeCompare(getPostTitle(b)));
        break;
      case "title_desc":
        posts.sort((a, b) => getPostTitle(b).localeCompare(getPostTitle(a)));
        break;
    }
    return posts;
  }, [data?.posts, sort]);

  const selectedPost =
    articleId !== null ? data?.posts.find((p) => p.id === articleId) : undefined;

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
        onFilterChange={(v) => {
          setFilter(v);
          if (page !== 1) setPage(1);
        }}
        sortValue={sort}
        onSortChange={(v) => {
          setSort(v);
          if (page !== 1) setPage(1);
        }}
        sortOptions={SORT_OPTIONS}
      />
      <div className={isFetching && isPlaceholderData ? "opacity-50 transition-opacity" : "transition-opacity"}>
        <PostGrid
          posts={filteredPosts}
          onSelectPost={(i) => {
            const post = filteredPosts[i];
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
