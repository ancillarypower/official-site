import { describe, it, expect } from "vitest";
import { resolveRendered, getPostTitle, getPostImage, wpPostSchema, type WpPost } from "@/lib/types";

describe("resolveRendered", () => {
  it("returns string directly", () => {
    expect(resolveRendered("hello")).toBe("hello");
  });

  it("extracts rendered field from object", () => {
    expect(resolveRendered({ rendered: "<p>content</p>" })).toBe("<p>content</p>");
  });

  it("returns empty string for null", () => {
    expect(resolveRendered(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(resolveRendered(undefined)).toBe("");
  });

  it("returns empty string for number", () => {
    expect(resolveRendered(42)).toBe("");
  });

  it("returns empty string for object without rendered field", () => {
    expect(resolveRendered({ other: "value" })).toBe("");
  });

  it("returns empty string for object with non-string rendered", () => {
    expect(resolveRendered({ rendered: 123 })).toBe("");
  });
});

describe("getPostTitle", () => {
  it("returns title when present", () => {
    const post = { id: 1, title: "My Post" } as WpPost;
    expect(getPostTitle(post)).toBe("My Post");
  });

  it("falls back to name when title is empty", () => {
    const post = { id: 1, title: "", name: "post-slug" } as WpPost;
    expect(getPostTitle(post)).toBe("post-slug");
  });

  it("falls back to #id when both title and name are empty", () => {
    const post = { id: 42, title: "" } as WpPost;
    expect(getPostTitle(post)).toBe("#42");
  });
});

describe("getPostImage", () => {
  it("returns { url, alt } for image media type", () => {
    const post = { id: 1, title: "T", source_url: "https://img.jpg", media_type: "image" } as WpPost;
    expect(getPostImage(post)).toEqual({ url: "https://img.jpg", alt: "T" });
  });

  it("returns null when source_url is present but media_type is not image", () => {
    const post = { id: 1, title: "T", source_url: "https://doc.pdf", media_type: "file" } as WpPost;
    expect(getPostImage(post)).toBeNull();
  });

  it("returns { url, alt } from featured media with alt_text", () => {
    const post = {
      id: 1,
      title: "T",
      _embedded: { "wp:featuredmedia": [{ source_url: "https://featured.jpg", alt_text: "Featured photo" }] },
    } as WpPost;
    expect(getPostImage(post)).toEqual({ url: "https://featured.jpg", alt: "Featured photo" });
  });

  it("falls back to post title when alt_text is missing", () => {
    const post = {
      id: 1,
      title: "T",
      _embedded: { "wp:featuredmedia": [{ source_url: "https://featured.jpg" }] },
    } as WpPost;
    expect(getPostImage(post)).toEqual({ url: "https://featured.jpg", alt: "T" });
  });

  it("returns null when no image available", () => {
    const post = { id: 1, title: "T" } as WpPost;
    expect(getPostImage(post)).toBeNull();
  });

  it("returns null when _embedded has empty featured media array", () => {
    const post = {
      id: 1,
      title: "T",
      _embedded: { "wp:featuredmedia": [] },
    } as WpPost;
    expect(getPostImage(post)).toBeNull();
  });
});

describe("wpPostSchema", () => {
  it("parses post with missing author name (Issue #323)", () => {
    const raw = {
      id: 1,
      title: { rendered: "Test Post" },
      date: "2026-01-01",
      _embedded: {
        author: [{}],
      },
    };
    const result = wpPostSchema.safeParse(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data._embedded?.author?.[0]?.name).toBe("");
    }
  });
});
