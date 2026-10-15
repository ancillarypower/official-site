import type { TranslationKey } from "@/i18n/zh";

/**
 * Per-content-type sort options for the WP REST list endpoints (Issue #598).
 *
 * Post-like endpoints (/wp/v2/posts, /pages, /media) accept orderby=date|title,
 * but taxonomy term endpoints (/wp/v2/categories, /tags) reject them with
 * 400 rest_invalid_param. Each content type therefore gets its own option set,
 * and useWordPress() re-checks the final orderby as a second line of defence.
 */

export interface SortParams {
  orderby: string;
  order: "asc" | "desc";
}

export interface SortOption {
  value: string;
  labelKey: TranslationKey;
}

export interface SortConfig {
  options: SortOption[];
  map: Record<string, SortParams>;
  defaultValue: string;
  defaultParams: SortParams;
}

/** orderby values accepted by WP REST taxonomy term endpoints. */
export const WP_TERM_ORDERBY = ["id", "include", "name", "slug", "include_slugs", "term_group", "description", "count"] as const;

/** orderby values accepted by every WP REST post-like endpoint used here (posts, pages, media). */
export const WP_POST_ORDERBY = ["author", "date", "id", "include", "modified", "parent", "relevance", "slug", "include_slugs", "title"] as const;

const TERM_CONTENT_TYPES: ReadonlySet<string> = new Set(["categories", "tags"]);

/** True for content types served by a WP taxonomy term endpoint. */
export function isTermContentType(contentType: string): boolean {
  return TERM_CONTENT_TYPES.has(contentType);
}

const POST_SORT: SortConfig = {
  options: [
    { value: "date_desc", labelKey: "sort_date_desc" },
    { value: "date_asc", labelKey: "sort_date_asc" },
    { value: "title_asc", labelKey: "sort_title_asc" },
    { value: "title_desc", labelKey: "sort_title_desc" },
  ],
  map: {
    date_desc: { orderby: "date", order: "desc" },
    date_asc: { orderby: "date", order: "asc" },
    title_asc: { orderby: "title", order: "asc" },
    title_desc: { orderby: "title", order: "desc" },
  },
  // Matches WordPress REST API defaults for post-like endpoints.
  defaultValue: "date_desc",
  defaultParams: { orderby: "date", order: "desc" },
};

const TERM_SORT: SortConfig = {
  options: [
    { value: "name_asc", labelKey: "sort_name_asc" },
    { value: "name_desc", labelKey: "sort_name_desc" },
    { value: "count_desc", labelKey: "sort_count_desc" },
    { value: "count_asc", labelKey: "sort_count_asc" },
  ],
  map: {
    name_asc: { orderby: "name", order: "asc" },
    name_desc: { orderby: "name", order: "desc" },
    count_desc: { orderby: "count", order: "desc" },
    count_asc: { orderby: "count", order: "asc" },
  },
  // Matches WordPress REST API defaults for term endpoints (orderby=name, order=asc).
  defaultValue: "name_asc",
  defaultParams: { orderby: "name", order: "asc" },
};

/** Sort options, UI-value map and default for a content type. */
export function getSortConfig(contentType: string): SortConfig {
  return isTermContentType(contentType) ? TERM_SORT : POST_SORT;
}

/**
 * Resolve a UI sort value (e.g. from `?sort=`) for a content type.
 * Unknown values, values belonging to another content type, and inherited
 * object keys such as "constructor" all fall back to the type's default.
 */
export function resolveSortParams(contentType: string, sortValue: string | null): { value: string; params: SortParams } {
  const config = getSortConfig(contentType);
  if (sortValue !== null && Object.prototype.hasOwnProperty.call(config.map, sortValue)) {
    const params = config.map[sortValue];
    if (params) return { value: sortValue, params };
  }
  return { value: config.defaultValue, params: config.defaultParams };
}

/**
 * Final guard before building the request URL: term endpoints only receive an
 * orderby they accept; anything else (date, title, ...) becomes "name".
 * Post-like content types are passed through unchanged.
 */
export function toWpOrderby(contentType: string, orderby: string): string {
  if (!isTermContentType(contentType)) return orderby;
  return (WP_TERM_ORDERBY as readonly string[]).includes(orderby) ? orderby : "name";
}
