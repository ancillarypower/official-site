import { describe, it, expect } from "vitest";
import { resolveRendered, getPostTitle, getPostImage } from "@/lib/types";
import type { WpPost } from "@/lib/types";

describe("resolveRendered", () => {
  it("returns plain string as-is", () => {
    expect(resolveRendered("hello")).toBe("hello");
  });

  it("extracts rendered from object", () => {
    expect(resolveRendered({ rendered: "<p>Hi</p>" })).toBe("<p>Hi</p>");
  });

  it("returns empty string for number", () => {
    expect(resolveRendered(42)).toBe("");
  });

  it("returns empty string for null", () => {
    expect(resolveRendered(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(resolveRendered(undefined)).toBe("");
  });

  it("returns empty string for object without rendered key", () => {
    expect(resolveRendered({ other: "val" })).toBe("");
  });

  it("returns empty string for object with non-string rendered", () => {
    expect(resolveRendered({ rendered: 123 })).toBe("");
  });
});

describe("getPostTitle", () => {
  it("returns title when present", () => {
    const post: WpPost = { id: 1, title: "My Post" };
    expect(getPostTitle(post)).toBe("My Post");
  });

  it("falls back to name when title is empty", () => {
    const post: WpPost = { id: 1, title: "", name: "slug-name" };
    expect(getPostTitle(post)).toBe("slug-name");
  });

  it("falls back to #id when both title and name are empty", () => {
    const post: WpPost = { id: 42, title: "" };
    expect(getPostTitle(post)).toBe("#42");
  });

  it("prefers title over name", () => {
    const post: WpPost = { id: 1, title: "Title", name: "name" };
    expect(getPostTitle(post)).toBe("Title");
  });
});

describe("getPostImage", () => {
  it("returns source_url for image media type", () => {
    const post: WpPost = {
      id: 1,
      title: "T",
      source_url: "https://img.jpg",
      media_type: "image",
    };
    expect(getPostImage(post)).toBe("https://img.jpg");
  });

  it("returns null when media_type is not image", () => {
    const post: WpPost = {
      id: 1,
      title: "T",
      source_url: "https://vid.mp4",
      media_type: "video",
    };
    expect(getPostImage(post)).toBeNull();
  });

  it("returns featured media from _embedded", () => {
    const post: WpPost = {
      id: 1,
      title: "T",
      _embedded: {
        "wp:featuredmedia": [{ source_url: "https://featured.jpg" }],
      },
    };
    expect(getPostImage(post)).toBe("https://featured.jpg");
  });

  it("returns null when no image data available", () => {
    const post: WpPost = { id: 1, title: "T" };
    expect(getPostImage(post)).toBeNull();
  });

  it("returns null when source_url exists but no media_type", () => {
    const post: WpPost = { id: 1, title: "T", source_url: "https://x.jpg" };
    expect(getPostImage(post)).toBeNull();
  });
});
