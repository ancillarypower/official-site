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

/**
 * Safely extract the string value from a WordPress REST API "rendered" field.
 * Handles both plain strings and `{ rendered: string }` objects that arrive
 * when the Zod transform is bypassed (e.g. safeParse fallback).
 */
export function resolveRendered(val: unknown): string {
  if (typeof val === "string") return val;
  if (
    val !== null &&
    val !== undefined &&
    typeof val === "object" &&
    "rendered" in val &&
    typeof (val as Record<string, unknown>).rendered === "string"
  ) {
    return (val as Record<string, unknown>).rendered as string;
  }
  return "";
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
