import { z } from "zod";
import { decodeHtml } from "@/lib/utils";

/* ── WordPress REST API schemas ── */

const wpRenderedField = z
  .union([z.string(), z.object({ rendered: z.string() })])
  .transform((val) => (typeof val === "string" ? val : val.rendered));

export const wpPostSchema = z.object({
  id: z.number(),
  date: z.string().optional(),
  link: z.string().optional(),
  title: wpRenderedField,
  content: wpRenderedField.optional(),
  excerpt: wpRenderedField.optional(),
  description: wpRenderedField.optional(),
  caption: wpRenderedField.optional(),
  name: z.string().optional(),
  source_url: z.string().optional(),
  media_type: z.string().optional(),
  _embedded: z
    .object({
      author: z.array(z.object({ name: z.string().default("") })).optional(),
      "wp:featuredmedia": z
        .array(
          z.object({
            source_url: z.string(),
            alt_text: z.string().optional(),
            media_details: z
              .object({
                width: z.number().optional(),
                height: z.number().optional(),
                sizes: z
                  .record(
                    z.object({
                      source_url: z.string(),
                      width: z.number(),
                      height: z.number(),
                    }),
                  )
                  .optional(),
              })
              .optional(),
          }),
        )
        .optional(),
      "wp:term": z
        .array(z.array(z.object({ name: z.string() })))
        .optional(),
    })
    .optional(),
});

export type WpPost = z.infer<typeof wpPostSchema>;

export const wpPostArraySchema = z.array(wpPostSchema);

/** Type guard for WP REST API `{ rendered: string }` objects. */
function isRenderedObject(val: unknown): val is { rendered: string } {
  return (
    typeof val === "object" &&
    val !== null &&
    "rendered" in val &&
    typeof (val as { rendered: unknown }).rendered === "string"
  );
}

/**
 * Safely extract the string value from a WordPress REST API "rendered" field.
 * Handles both plain strings and `{ rendered: string }` objects that arrive
 * when the Zod transform is bypassed (e.g. safeParse fallback).
 */
export function resolveRendered(val: unknown): string {
  if (typeof val === "string") return val;
  if (isRenderedObject(val)) return val.rendered;
  return "";
}

/* ── WordPress post helpers ── */

/**
 * Extract a display-safe title from a WpPost.
 *
 * Decodes HTML entities (e.g. `&amp;` → `&`) so that downstream consumers
 * (search filtering, sort comparison, alt text) operate on human-readable
 * text instead of encoded strings.
 *
 * The return value is already decoded: callers must NOT pass it through
 * `decodeHtml` again. `decodeHtml` is not idempotent (it strips one entity
 * layer per call), so a second pass turns a title that literally shows
 * `&lt;` into `<`, and can throw `RangeError` on out-of-range numeric
 * entities (Issue #594).
 */
export function getPostTitle(post: WpPost): string {
  return decodeHtml(post.title || post.name || `#${post.id}`);
}

/**
 * Build a `srcset` string from WordPress `media_details.sizes`.
 *
 * Returns `undefined` when no usable size entries exist, so callers can
 * safely spread the result onto `<img>` without rendering an empty attribute.
 */
function buildSrcSet(
  sizes:
    | Record<string, { source_url: string; width: number; height: number }>
    | undefined,
): string | undefined {
  if (!sizes) return undefined;
  const entries = Object.values(sizes)
    .filter((s) => s.source_url && s.width > 0)
    .sort((a, b) => a.width - b.width);
  if (entries.length === 0) return undefined;
  return entries.map((s) => `${s.source_url} ${s.width}w`).join(", ");
}

/**
 * Extract the best available image URL and descriptive alt text from a WpPost.
 *
 * Returns `{ url, alt, width?, height?, srcSet? }` so callers can set
 * meaningful `alt`, `width`/`height` (CLS), and `srcSet` (responsive)
 * attributes on `<img>` elements (WCAG 1.1.1, Issue #118, Issue #580).
 *
 * Alt text priority:
 * 1. `alt_text` from `wp:featuredmedia` (WordPress media library field)
 * 2. Post title as fallback (always non-empty)
 */
export function getPostImage(
  post: WpPost,
): { url: string; alt: string; width?: number; height?: number; srcSet?: string } | null {
  if (post.source_url && post.media_type === "image") {
    return { url: post.source_url, alt: getPostTitle(post) };
  }
  const media = post._embedded?.["wp:featuredmedia"]?.[0];
  if (!media) return null;
  return {
    url: media.source_url,
    alt: media.alt_text || getPostTitle(post),
    width: media.media_details?.width,
    height: media.media_details?.height,
    srcSet: buildSrcSet(media.media_details?.sizes),
  };
}

/* ── WooCommerce REST API schemas ── */

export const wooProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  price: z.string().default("0"),
  regular_price: z.string().default("0"),
  sale_price: z.string().default(""),
  short_description: z.string().default(""),
  stock_status: z.string().default("instock"),
  images: z
    .array(z.object({ src: z.string() }))
    .default([]),
});

export type WooProduct = z.infer<typeof wooProductSchema>;

export const wooProductArraySchema = z.array(wooProductSchema);

export const wooOrderSchema = z.object({
  id: z.number(),
  order_key: z.string().optional(),
  payment_url: z.string().optional(),
});

export type WooOrder = z.infer<typeof wooOrderSchema>;

/* ── 3D Model DB record ── */

export interface ModelRecord {
  id?: number;
  name: string;
  size: number;
  ext: string;
  data: ArrayBuffer;
  timestamp: number;
  /** SHA-256 hex digest of the file content for deduplication. */
  hash?: string;
  /** Last modification timestamp (e.g. rename). Falls back to timestamp when absent. */
  updatedAt?: number;
}

/** Model metadata without the heavy ArrayBuffer payload. */
export type ModelMeta = Omit<ModelRecord, "data">;

/* ── Display product (unified for sample + Woo) ── */

export interface DisplayProduct {
  id: number;
  name: string;
  desc: string;
  price: number;
  regularPrice?: number;
  salePrice?: number | null;
  img: string | null;
  icon: string | null;
  stockStatus: string;
}
