import { useState, useMemo } from "react";
import { useWordPress } from "@/hooks/useWordPress";
import { useI18n } from "@/context/I18nContext";
import { useSettingsStore } from "@/stores/settingsStore";
import { PostGrid } from "@/components/content/PostGrid";
import { ArticleView } from "@/components/content/ArticleView";
import { Pagination } from "@/components/ui/Pagination";
import { ContentToolbar } from "@/components/ui/ContentToolbar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import type { WpPost } from "@/lib/types";

const SORT_OPTIONS = [
  { value: "date_desc", labelKey: "sort_date_desc" },
  { value: "date_asc", labelKey: "sort_date_asc" },
  { value: "title_asc", labelKey: "sort_title_asc" },
  { value: "title_desc", labelKey: "sort_title_desc" },
];

function getPostTitle(post: WpPost): string {
  return post.title || post.name || `#${post.id}`;
}

export default function ContentPage() {
  const { t } = useI18n();
  const contentType = useSettingsStore((s) => s.contentType);
  const [page, setPage] = useState(1);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState("date_desc");

  const { data, isLoading, error } = useWordPress(page);

  const filteredPosts = useMemo(() => {
    if (!data?.posts) return [];
    let posts = [...data.posts];
    const q = filter.toLowerCase().trim();
    if (q) posts = posts.filter((p) => getPostTitle(p).toLowerCase().includes(q));
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
  }, [data?.posts, filter, sort]);

  // Extract selected post to a variable so TS can narrow the type
  // (repeated array access is not narrowed by noUncheckedIndexedAccess)
  const selectedPost =
    selectedIndex !== null ? data?.posts[selectedIndex] : undefined;

  if (selectedPost) {
    return (
      <ArticleView
        post={selectedPost}
        onBack={() => setSelectedIndex(null)}
      />
    );
  }

  if (isLoading) return <LoadingSpinner />;
  if (error) return <EmptyState icon="\u26a0\ufe0f" title={(error as Error).message} />;
  if (!data?.posts.length) return <EmptyState icon="\ud83d\udced" title={t("no_results")} />;

  const typeLabel = t(`type_${contentType}` as Parameters<typeof t>[0]);

  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex items-baseline gap-3 border-b border-border-subtle pb-4">
        <h2 className="text-lg font-bold">{typeLabel}</h2>
        <span className="text-xs text-tertiary">
          {t("total_items", { n: data.totalPosts })}
        </span>
      </div>
      <ContentToolbar
        filterValue={filter}
        onFilterChange={setFilter}
        sortValue={sort}
        onSortChange={setSort}
        sortOptions={SORT_OPTIONS}
      />
      <PostGrid
        posts={filteredPosts}
        onSelectPost={(i) => {
          const post = filteredPosts[i];
          if (post) setSelectedIndex(data.posts.indexOf(post));
        }}
      />
      <Pagination
        currentPage={page}
        totalPages={data.totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
