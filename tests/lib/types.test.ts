import { describe, it, expect } from "vitest";
import {
  wpPostSchema,
  wpPostArraySchema,
  wooProductSchema,
  wooProductArraySchema,
  wooOrderSchema,
  resolveRendered,
} from "@/lib/types";

describe("resolveRendered", () => {
  it("returns the string as-is when given a plain string", () => {
    expect(resolveRendered("Hello World")).toBe("Hello World");
  });

  it("extracts .rendered from a rendered object", () => {
    expect(resolveRendered({ rendered: "Hello World" })).toBe("Hello World");
  });

  it("returns empty string for null", () => {
    expect(resolveRendered(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(resolveRendered(undefined)).toBe("");
  });

  it("returns empty string for a number", () => {
    expect(resolveRendered(42)).toBe("");
  });

  it("returns empty string for an object without rendered key", () => {
    expect(resolveRendered({ title: "oops" })).toBe("");
  });

  it("returns empty string when rendered value is not a string", () => {
    expect(resolveRendered({ rendered: 123 })).toBe("");
  });
});

describe("wpPostSchema", () => {
  it("parses a post with rendered fields", () => {
    const result = wpPostSchema.safeParse({
      id: 1,
      date: "2026-01-01T00:00:00",
      title: { rendered: "Hello World" },
      content: { rendered: "<p>Body</p>" },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Hello World");
      expect(result.data.content).toBe("<p>Body</p>");
    }
  });

  it("parses a post with plain string title", () => {
    const result = wpPostSchema.safeParse({ id: 2, title: "Plain Title" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.title).toBe("Plain Title");
  });

  it("parses embedded author and featured media", () => {
    const result = wpPostSchema.safeParse({
      id: 3, title: "Test",
      _embedded: {
        author: [{ name: "Alice" }],
        "wp:featuredmedia": [{ source_url: "https://img.com/photo.jpg" }],
        "wp:term": [[{ name: "Tech" }, { name: "News" }]],
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data._embedded?.author?.[0]?.name).toBe("Alice");
      expect(result.data._embedded?.["wp:featuredmedia"]?.[0]?.source_url).toBe("https://img.com/photo.jpg");
      expect(result.data._embedded?.["wp:term"]?.[0]).toHaveLength(2);
    }
  });

  it("rejects missing id", () => {
    expect(wpPostSchema.safeParse({ title: "No ID" }).success).toBe(false);
  });
});

describe("wpPostArraySchema", () => {
  it("parses an array of posts", () => {
    const result = wpPostArraySchema.safeParse([{ id: 1, title: "A" }, { id: 2, title: { rendered: "B" } }]);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toHaveLength(2);
  });
});

describe("wooProductSchema", () => {
  it("parses a product with defaults", () => {
    const result = wooProductSchema.safeParse({ id: 100, name: "Widget" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBe("0");
      expect(result.data.stock_status).toBe("instock");
      expect(result.data.images).toEqual([]);
    }
  });

  it("parses a full product", () => {
    const result = wooProductSchema.safeParse({
      id: 101, name: "Gadget", price: "29.99", regular_price: "39.99", sale_price: "29.99",
      short_description: "<p>A gadget</p>", stock_status: "instock",
      images: [{ src: "https://img.com/gadget.jpg" }],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.images[0]?.src).toBe("https://img.com/gadget.jpg");
  });
});

describe("wooProductArraySchema", () => {
  it("parses an array of products", () => {
    expect(wooProductArraySchema.safeParse([{ id: 1, name: "A" }, { id: 2, name: "B", price: "10" }]).success).toBe(true);
  });
});

describe("wooOrderSchema", () => {
  it("parses an order", () => {
    const result = wooOrderSchema.safeParse({ id: 500, order_key: "wc_order_abc123", payment_url: "https://shop.com/pay/500" });
    expect(result.success).toBe(true);
    if (result.success) { expect(result.data.id).toBe(500); expect(result.data.payment_url).toBe("https://shop.com/pay/500"); }
  });

  it("parses an order with only id", () => {
    expect(wooOrderSchema.safeParse({ id: 501 }).success).toBe(true);
  });
});
