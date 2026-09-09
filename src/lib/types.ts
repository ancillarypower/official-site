import { z } from "zod";

/* ── WordPress REST API schemas ── */

const wpRenderedField = z
  .union([z.string(), z.object({ rendered: z.string() })])
  .transform((val) => (typeof val === "string" ? val : val.rendered));

export const wpPostSchema = z.object({
  id: z.number(),
  date: z.string().optional(),
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
      author: z.array(z.object({ name: z.string() })).optional(),
      "wp:featuredmedia": z
        .array(z.object({ source_url: z.string() }))
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

/** Extract a display-safe title from a WpPost. */
export function getPostTitle(post: WpPost): string {
  return post.title || post.name || `#${post.id}`;
}

/** Extract the best available image URL from a WpPost. */
export function getPostImage(post: WpPost): string | null {
  if (post.source_url && post.media_type === "image") return post.source_url;
  return post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null;
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
}

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
