import { describe, it, expect } from "vitest";
import { normalizeRawPost, resolveEmbedded } from "@/hooks/useWordPress";

describe("normalizeRawPost", () => {
  it("returns defaults for empty object", () => {
    const post = normalizeRawPost({});
    expect(post.id).toBe(0);
    expect(post.title).toBe("");
    expect(post.date).toBeUndefined();
    expect(post.content).toBeUndefined();
    expect(post.excerpt).toBeUndefined();
    expect(post.name).toBeUndefined();
    expect(post.source_url).toBeUndefined();
    expect(post.media_type).toBeUndefined();
  });

  it("preserves valid field values", () => {
    const post = normalizeRawPost({
      id: 42,
      title: "Test Post",
      date: "2026-01-01",
      name: "test-post",
      source_url: "https://example.com/img.jpg",
      media_type: "image",
    });
    expect(post.id).toBe(42);
    expect(post.title).toBe("Test Post");
    expect(post.date).toBe("2026-01-01");
    expect(post.name).toBe("test-post");
    expect(post.source_url).toBe("https://example.com/img.jpg");
    expect(post.media_type).toBe("image");
  });

  it("resolves rendered objects in title field", () => {
    const post = normalizeRawPost({
      id: 1,
      title: { rendered: "Rendered Title" },
    });
    expect(post.title).toBe("Rendered Title");
  });

  it("resolves rendered objects in content field", () => {
    const post = normalizeRawPost({
      id: 1,
      content: { rendered: "<p>Hello</p>" },
    });
    expect(post.content).toBe("<p>Hello</p>");
  });

  it("resolves rendered objects in excerpt field", () => {
    const post = normalizeRawPost({
      id: 1,
      excerpt: { rendered: "<p>Summary</p>" },
    });
    expect(post.excerpt).toBe("<p>Summary</p>");
  });

  it("resolves rendered objects in description field", () => {
    const post = normalizeRawPost({
      id: 1,
      description: { rendered: "Category desc" },
    });
    expect(post.description).toBe("Category desc");
  });

  it("resolves rendered objects in caption field", () => {
    const post = normalizeRawPost({
      id: 1,
      caption: { rendered: "Image caption" },
    });
    expect(post.caption).toBe("Image caption");
  });

  it("coerces wrong types to defaults", () => {
    const post = normalizeRawPost({
      id: "not-a-number",
      title: 123,
      date: 456,
      name: 789,
    });
    expect(post.id).toBe(0);
    expect(post.title).toBe("");
    expect(post.date).toBeUndefined();
    expect(post.name).toBeUndefined();
  });

  it("validates _embedded structure instead of passing through", () => {
    const embedded = { author: [{ name: "John" }] };
    const post = normalizeRawPost({ id: 1, _embedded: embedded });
    expect(post._embedded).toEqual({ author: [{ name: "John" }], "wp:featuredmedia": undefined, "wp:term": undefined });
  });
});

describe("resolveEmbedded", () => {
  it("returns undefined for non-object _embedded", () => {
    expect(resolveEmbedded("string")).toBeUndefined();
    expect(resolveEmbedded(123)).toBeUndefined();
    expect(resolveEmbedded(null)).toBeUndefined();
    expect(resolveEmbedded(undefined)).toBeUndefined();
    expect(resolveEmbedded(true)).toBeUndefined();
  });

  it("defaults author name to empty string when missing", () => {
    const result = resolveEmbedded({ author: [{}, { name: "John" }] });
    expect(result?.author).toEqual([{ name: "" }, { name: "John" }]);
  });

  it("filters out media entries without source_url", () => {
    const result = resolveEmbedded({
      "wp:featuredmedia": [{ id: 1 }, { source_url: "https://example.com/img.jpg" }],
    });
    expect(result?.["wp:featuredmedia"]).toEqual([{ source_url: "https://example.com/img.jpg" }]);
  });

  it("handles malformed wp:term gracefully", () => {
    const result = resolveEmbedded({
      "wp:term": ["not-array", [{ name: "tag" }, { id: 2 }]],
    });
    expect(result?.["wp:term"]).toEqual([[{ name: "tag" }]]);
  });

  it("returns undefined fields when _embedded is empty object", () => {
    const result = resolveEmbedded({});
    expect(result?.author).toBeUndefined();
    expect(result?.["wp:featuredmedia"]).toBeUndefined();
    expect(result?.["wp:term"]).toBeUndefined();
  });
});
