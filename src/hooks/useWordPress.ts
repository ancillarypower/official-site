import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchWithProxy, wpApiUrl } from "@/lib/api";
import { wpPostArraySchema, type WpPost, resolveRendered } from "@/lib/types";
import { useSettingsStore } from "@/stores/settingsStore";

interface WpQueryResult {
  posts: WpPost[];
  totalPages: number;
  totalPosts: number;
}

/**
 * Safely parse a raw `_embedded` value into the shape expected by WpPost.
 * Unlike the previous `as WpPost["_embedded"]` type assertion, this validates
 * each nested structure (author, wp:featuredmedia, wp:term) at runtime.
 */
export function resolveEmbedded(raw: unknown): WpPost["_embedded"] {
  if (typeof raw !== "object" || raw === null) return undefined;
  const obj = raw as Record<string, unknown>;

  const author = Array.isArray(obj.author)
    ? obj.author
        .filter((a): a is Record<string, unknown> => typeof a === "object" && a !== null)
        .map((a) => ({ name: typeof a.name === "string" ? a.name : "" }))
    : undefined;

  const media = Array.isArray(obj["wp:featuredmedia"])
    ? obj["wp:featuredmedia"].filter(
        (m): m is { source_url: string } =>
          typeof m === "object" &&
          m !== null &&
          typeof (m as Record<string, unknown>).source_url === "string",
      )
    : undefined;

  const term = Array.isArray(obj["wp:term"])
    ? obj["wp:term"]
        .filter((group): group is unknown[] => Array.isArray(group))
        .map((group) =>
          group.filter(
            (t): t is { name: string } =>
              typeof t === "object" &&
              t !== null &&
              typeof (t as Record<string, unknown>).name === "string",
          ),
        )
    : undefined;

  return {
    author,
    "wp:featuredmedia": media,
    "wp:term": term,
  };
}

/**
 * Normalize a raw API response item into a shape that matches WpPost
 * when Zod safeParse fails and the transform step is skipped.
 */
export function normalizeRawPost(p: Record<string, unknown>): WpPost {
  return {
    id: typeof p.id === "number" ? p.id : 0,
    date: typeof p.date === "string" ? p.date : undefined,
    title: resolveRendered(p.title),
    content: p.content !== undefined ? resolveRendered(p.content) : undefined,
    excerpt: p.excerpt !== undefined ? resolveRendered(p.excerpt) : undefined,
    description: p.description !== undefined ? resolveRendered(p.description) : undefined,
    caption: p.caption !== undefined ? resolveRendered(p.caption) : undefined,
    name: typeof p.name === "string" ? p.name : undefined,
    source_url: typeof p.source_url === "string" ? p.source_url : undefined,
    media_type: typeof p.media_type === "string" ? p.media_type : undefined,
    _embedded: resolveEmbedded(p._embedded),
  };
}

export function useWordPress(page: number = 1, search: string = "") {
  const wpUrl = useSettingsStore((s) => s.wpUrl);
  const contentType = useSettingsStore((s) => s.contentType);
  const perPage = useSettingsStore((s) => s.perPage);
  const useProxy = useSettingsStore((s) => s.useProxy);

  return useQuery<WpQueryResult>({
    queryKey: ["wp-content", wpUrl, contentType, perPage, page, search, useProxy],
    queryFn: async () => {
      const api = wpApiUrl(wpUrl);
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
      const url = `${api}/${contentType}?per_page=${perPage}&page=${page}&_embed${searchParam}`;

      const response = await fetchWithProxy(url, useProxy);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const hasPageHeader =
        response.headers.has("X-WP-TotalPages") ||
        response.headers.has("x-wp-totalpages");

      let totalPages = parseInt(
        response.headers.get("X-WP-TotalPages") ??
          response.headers.get("x-wp-totalpages") ?? "1",
        10,
      );
      let totalPosts = parseInt(
        response.headers.get("X-WP-Total") ??
          response.headers.get("x-wp-total") ?? "0",
        10,
      );

      const raw = await response.json();

      // Fallback: when CORS proxy strips custom response headers,
      // infer pagination from the response body length (Issue #178).
      if (!hasPageHeader && Array.isArray(raw)) {
        totalPages = raw.length >= perPage ? page + 1 : page;
        totalPosts = totalPosts || raw.length;
      }

      const parsed = wpPostArraySchema.safeParse(raw);

      if (!parsed.success) {
        console.warn("[WP] Zod parse warning:", parsed.error);
        if (!Array.isArray(raw)) {
          throw new Error("Unexpected API response: expected an array");
        }
        const posts = (raw as Record<string, unknown>[]).map(normalizeRawPost);
        return { posts, totalPages, totalPosts };
      }

      return { posts: parsed.data, totalPages, totalPosts: totalPosts || parsed.data.length };
    },
    enabled: !!wpUrl,
    placeholderData: keepPreviousData,
  });
}
