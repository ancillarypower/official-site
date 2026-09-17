import { describe, it, expect } from "vitest";
import { resolveRendered, getPostTitle, getPostImage, type WpPost } from "@/lib/types";

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
  it("returns source_url for image media type", () => {
    const post = { id: 1, title: "T", source_url: "https://img.jpg", media_type: "image" } as WpPost;
    expect(getPostImage(post)).toBe("https://img.jpg");
  });

  it("returns null when source_url is present but media_type is not image", () => {
    const post = { id: 1, title: "T", source_url: "https://doc.pdf", media_type: "file" } as WpPost;
    expect(getPostImage(post)).toBeNull();
  });

  it("returns featured media URL from _embedded", () => {
    const post = {
      id: 1,
      title: "T",
      _embedded: { "wp:featuredmedia": [{ source_url: "https://featured.jpg" }] },
    } as WpPost;
    expect(getPostImage(post)).toBe("https://featured.jpg");
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
