import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchWithProxy, wpApiUrl, wpBuildUrl, parseJsonResponse } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { wpPostArraySchema, wpPostSchema, type WpPost, resolveRendered } from "@/lib/types";
import { useSettingsStore } from "@/stores/settingsStore";

interface WpQueryResult { posts: WpPost[]; totalPages: number; totalPosts: number; }

export function resolveEmbedded(raw: unknown): WpPost["_embedded"] {
  if (typeof raw !== "object" || raw === null) return undefined;
  const obj = raw as Record<string, unknown>;
  const author = Array.isArray(obj.author) ? obj.author.filter((a): a is Record<string, unknown> => typeof a === "object" && a !== null).map((a) => ({ name: typeof a.name === "string" ? a.name : "" })) : undefined;
  const media = Array.isArray(obj["wp:featuredmedia"]) ? obj["wp:featuredmedia"].filter((m): m is Record<string, unknown> => typeof m === "object" && m !== null && typeof (m as Record<string, unknown>).source_url === "string").map((m) => {
    const md = typeof m.media_details === "object" && m.media_details !== null ? m.media_details as Record<string, unknown> : undefined;
    return {
      source_url: m.source_url as string,
      alt_text: typeof m.alt_text === "string" ? m.alt_text : undefined,
      media_details: md ? {
        width: typeof md.width === "number" ? md.width : undefined,
        height: typeof md.height === "number" ? md.height : undefined,
        sizes: typeof md.sizes === "object" && md.sizes !== null
          ? Object.fromEntries(
              Object.entries(md.sizes as Record<string, unknown>)
                .filter(([, v]) => typeof v === "object" && v !== null
                  && typeof (v as Record<string, unknown>).source_url === "string"
                  && typeof (v as Record<string, unknown>).width === "number"
                  && typeof (v as Record<string, unknown>).height === "number")
                .map(([k, v]) => [k, v as { source_url: string; width: number; height: number }]),
            )
          : undefined,
      } : undefined,
    };
  }) : undefined;
  const term = Array.isArray(obj["wp:term"]) ? obj["wp:term"].filter((group): group is unknown[] => Array.isArray(group)).map((group) => group.filter((t): t is { name: string } => typeof t === "object" && t !== null && typeof (t as Record<string, unknown>).name === "string")) : undefined;
  return { author, "wp:featuredmedia": media, "wp:term": term };
}

export function normalizeRawPost(p: Record<string, unknown>): WpPost {
  return { id: typeof p.id === "number" ? p.id : 0, date: typeof p.date === "string" ? p.date : undefined, title: resolveRendered(p.title), content: p.content !== undefined ? resolveRendered(p.content) : undefined, excerpt: p.excerpt !== undefined ? resolveRendered(p.excerpt) : undefined, description: p.description !== undefined ? resolveRendered(p.description) : undefined, caption: p.caption !== undefined ? resolveRendered(p.caption) : undefined, name: typeof p.name === "string" ? p.name : undefined, source_url: typeof p.source_url === "string" ? p.source_url : undefined, media_type: typeof p.media_type === "string" ? p.media_type : undefined, _embedded: resolveEmbedded(p._embedded) };
}

export function useWordPress(page = 1, search = "", orderby = "date", order = "desc", tags: number[] = [], enabled = true) {
  const wpUrl = useSettingsStore((s) => s.wpUrl), contentType = useSettingsStore((s) => s.contentType), perPage = useSettingsStore((s) => s.perPage), useProxy = useSettingsStore((s) => s.useProxy);
  return useQuery<WpQueryResult>({
    queryKey: ["wp-content", wpUrl, contentType, perPage, page, search, useProxy, orderby, order, tags],
    queryFn: async ({ signal }) => {
      const url = wpBuildUrl(wpApiUrl(wpUrl), contentType, { per_page: String(perPage), page: String(page), _embed: "", orderby, order, ...(search ? { search } : {}), ...(tags.length > 0 ? { tags: tags.join(",") } : {}) });
      const response = await fetchWithProxy(url, useProxy, { signal });
      if (!response.ok) throw new AppError("error_api_http", `HTTP ${response.status}`, { status: String(response.status) });
      const hasPageHeader = response.headers.has("X-WP-TotalPages") || response.headers.has("x-wp-totalpages");
      let totalPages = parseInt(response.headers.get("X-WP-TotalPages") ?? response.headers.get("x-wp-totalpages") ?? "1", 10);
      let totalPosts = parseInt(response.headers.get("X-WP-Total") ?? response.headers.get("x-wp-total") ?? "0", 10);
      const raw = await parseJsonResponse(response);
      if (!hasPageHeader && Array.isArray(raw)) { totalPages = raw.length >= perPage ? page + 1 : page; totalPosts = totalPosts || raw.length; }
      const parsed = wpPostArraySchema.safeParse(raw);
      if (!parsed.success) { console.warn("[WP] Zod parse warning:", parsed.error); if (!Array.isArray(raw)) throw new AppError("error_api_unexpected_format", "Unexpected API response: expected an array"); return { posts: (raw as Record<string, unknown>[]).map(normalizeRawPost), totalPages, totalPosts }; }
      return { posts: parsed.data, totalPages, totalPosts: totalPosts || parsed.data.length };
    }, enabled: !!wpUrl && enabled, placeholderData: keepPreviousData,
  });
}

export function useSinglePost(id: number | null) {
  const wpUrl = useSettingsStore((s) => s.wpUrl), contentType = useSettingsStore((s) => s.contentType), useProxy = useSettingsStore((s) => s.useProxy);
  return useQuery<WpPost | null>({
    queryKey: ["wp-single-post", wpUrl, contentType, id, useProxy],
    queryFn: async ({ signal }) => {
      const url = wpBuildUrl(wpApiUrl(wpUrl), `${contentType}/${id}`, { _embed: "" });
      const response = await fetchWithProxy(url, useProxy, { signal });
      if (response.status === 404) return null;
      if (!response.ok) throw new AppError("error_api_http", `HTTP ${response.status}`, { status: String(response.status) });
      const raw = await parseJsonResponse(response), parsed = wpPostSchema.safeParse(raw);
      if (!parsed.success) { console.warn("[WP] Single post Zod parse warning:", parsed.error); if (typeof raw !== "object" || raw === null) throw new AppError("error_api_unexpected_format", "Unexpected API response: expected an object"); return normalizeRawPost(raw as Record<string, unknown>); }
      return parsed.data;
    }, enabled: !!wpUrl && id !== null, retry: false,
  });
}
