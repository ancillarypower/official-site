import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { fetchWithProxy, wpApiUrl, parseJsonResponse } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { WP_MAX_PER_PAGE } from "@/lib/constants";
import { useSettingsStore } from "@/stores/settingsStore";

export const wpTagSchema = z.object({
  id: z.number(),
  name: z.string(),
  count: z.number().optional(),
});

export type WpTag = z.infer<typeof wpTagSchema>;

export const wpTagArraySchema = z.array(wpTagSchema);

/** Safety cap: never fetch more than this many pages of tags. */
const MAX_TAG_PAGES = 10;

/**
 * Fetch **all** WordPress tags across paginated API responses.
 *
 * Exported for direct testing. Called internally by {@link useWpTags}.
 *
 * Handles pagination transparently: checks `X-WP-TotalPages` header
 * first, falls back to response-length inference when the CORS proxy
 * strips custom headers (Issue #178). Capped at {@link MAX_TAG_PAGES}
 * pages (up to 1,000 tags) to prevent runaway loops.
 */
export async function fetchAllWpTags(
  apiBase: string,
  useProxy: boolean,
  signal: AbortSignal,
): Promise<WpTag[]> {
  const allRaw: unknown[] = [];

  // --- First page ------------------------------------------------
  const firstUrl = `${apiBase}/tags?per_page=${WP_MAX_PER_PAGE}&page=1&_fields=id,name,count`;
  const firstResponse = await fetchWithProxy(firstUrl, useProxy, { signal });
  if (!firstResponse.ok) {
    throw new AppError("error_api_http", `HTTP ${firstResponse.status}`, {
      status: String(firstResponse.status),
    });
  }

  const firstRaw = await parseJsonResponse(firstResponse);
  if (!Array.isArray(firstRaw)) {
    // Single-page non-array: validate and return directly
    const parsed = wpTagArraySchema.safeParse(firstRaw);
    if (!parsed.success) return [];
    return parsed.data;
  }
  allRaw.push(...firstRaw);

  // --- Determine total pages ------------------------------------
  const hasPageHeader =
    firstResponse.headers.has("X-WP-TotalPages") ||
    firstResponse.headers.has("x-wp-totalpages");

  let totalPages: number;
  if (hasPageHeader) {
    totalPages = parseInt(
      firstResponse.headers.get("X-WP-TotalPages") ??
        firstResponse.headers.get("x-wp-totalpages") ??
        "1",
      10,
    );
  } else {
    // Fallback: infer from response length (CORS proxy mode)
    totalPages = firstRaw.length >= WP_MAX_PER_PAGE ? 2 : 1;
  }

  // Cap to safety limit
  totalPages = Math.min(totalPages, MAX_TAG_PAGES);

  // --- Fetch remaining pages ------------------------------------
  for (let page = 2; page <= totalPages; page++) {
    const url = `${apiBase}/tags?per_page=${WP_MAX_PER_PAGE}&page=${page}&_fields=id,name,count`;
    const response = await fetchWithProxy(url, useProxy, { signal });
    if (!response.ok) {
      throw new AppError("error_api_http", `HTTP ${response.status}`, {
        status: String(response.status),
      });
    }

    const raw = await parseJsonResponse(response);
    if (!Array.isArray(raw)) break;
    allRaw.push(...raw);

    // Header-less mode: keep going until a short page
    if (!hasPageHeader) {
      if (raw.length < WP_MAX_PER_PAGE) break;
      // Might have more pages; bump totalPages (still capped)
      totalPages = Math.min(page + 1, MAX_TAG_PAGES);
    }
  }

  // --- Validate all tags at once --------------------------------
  const parsed = wpTagArraySchema.safeParse(allRaw);

  if (!parsed.success) {
    console.warn("[WP] Tags Zod parse warning:", parsed.error);
    if (!Array.isArray(allRaw)) return [];
    return (allRaw as Record<string, unknown>[])
      .filter((t) => typeof t.id === "number" && typeof t.name === "string")
      .map((t) => ({
        id: t.id as number,
        name: t.name as string,
        count: typeof t.count === "number" ? t.count : undefined,
      }));
  }

  return parsed.data;
}

/**
 * Fetch **all** WordPress tags for use in tag filtering.
 *
 * Only enabled when contentType is "posts" (pages/media/categories
 * do not support tag filtering in the WordPress REST API).
 *
 * Uses `_fields=id,name,count` to minimize response payload.
 */
export function useWpTags() {
  const wpUrl = useSettingsStore((s) => s.wpUrl);
  const contentType = useSettingsStore((s) => s.contentType);
  const useProxy = useSettingsStore((s) => s.useProxy);

  return useQuery<WpTag[]>({
    queryKey: ["wp-tags", wpUrl, useProxy],
    queryFn: ({ signal }) => fetchAllWpTags(wpApiUrl(wpUrl), useProxy, signal),
    enabled: !!wpUrl && contentType === "posts",
    staleTime: 5 * 60 * 1000, // Tags rarely change; cache 5 min
  });
}
