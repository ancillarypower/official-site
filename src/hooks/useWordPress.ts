import { useQuery } from "@tanstack/react-query";
import { fetchWithProxy, wpApiUrl } from "@/lib/api";
import { wpPostArraySchema, type WpPost, resolveRendered } from "@/lib/types";
import { useSettingsStore } from "@/stores/settingsStore";

interface WpQueryResult {
  posts: WpPost[];
  totalPages: number;
  totalPosts: number;
}

/**
 * Normalize a raw API response item into a shape that matches WpPost
 * when Zod safeParse fails and the transform step is skipped.
 */
function normalizeRawPost(p: Record<string, unknown>): WpPost {
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
    _embedded: p._embedded as WpPost["_embedded"],
  };
}

export function useWordPress(page: number = 1) {
  const { wpUrl, contentType, perPage, useProxy } = useSettingsStore();

  return useQuery<WpQueryResult>({
    queryKey: ["wp-content", wpUrl, contentType, perPage, page],
    queryFn: async () => {
      const api = wpApiUrl(wpUrl);
      const url = `${api}/${contentType}?per_page=${perPage}&page=${page}&_embed`;

      const response = await fetchWithProxy(url, useProxy);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const totalPages = parseInt(
        response.headers.get("X-WP-TotalPages") ??
          response.headers.get("x-wp-totalpages") ?? "1",
        10,
      );
      const totalPosts = parseInt(
        response.headers.get("X-WP-Total") ??
          response.headers.get("x-wp-total") ?? "0",
        10,
      );

      const raw = await response.json();
      const parsed = wpPostArraySchema.safeParse(raw);

      if (!parsed.success) {
        console.warn("[WP] Zod parse warning:", parsed.error);
        const posts = (raw as Record<string, unknown>[]).map(normalizeRawPost);
        return { posts, totalPages, totalPosts };
      }

      return { posts: parsed.data, totalPages, totalPosts: totalPosts || parsed.data.length };
    },
    enabled: !!wpUrl,
  });
}
