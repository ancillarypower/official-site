import { describe, it, expect } from "vitest";
import { normalizeRawPost } from "@/hooks/useWordPress";

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

  it("passes through _embedded as-is", () => {
    const embedded = { author: [{ name: "John" }] };
    const post = normalizeRawPost({ id: 1, _embedded: embedded });
    expect(post._embedded).toBe(embedded);
  });
});
