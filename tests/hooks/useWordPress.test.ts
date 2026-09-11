import { describe, it, expect } from "vitest";
import { normalizeRawPost } from "@/hooks/useWordPress";

describe("normalizeRawPost", () => {
  it("normalizes a raw post with all fields", () => {
    const raw = {
      id: 42,
      date: "2026-01-01",
      title: { rendered: "Hello World" },
      content: { rendered: "<p>Content</p>" },
      excerpt: { rendered: "Excerpt" },
      name: "hello-world",
      source_url: "https://example.com/img.jpg",
      media_type: "image",
    };
    const result = normalizeRawPost(raw);
    expect(result.id).toBe(42);
    expect(result.date).toBe("2026-01-01");
    expect(result.title).toBe("Hello World");
    expect(result.content).toBe("<p>Content</p>");
    expect(result.excerpt).toBe("Excerpt");
    expect(result.name).toBe("hello-world");
    expect(result.source_url).toBe("https://example.com/img.jpg");
    expect(result.media_type).toBe("image");
  });

  it("handles plain string title", () => {
    const raw = { id: 1, title: "Plain Title" };
    const result = normalizeRawPost(raw);
    expect(result.title).toBe("Plain Title");
  });

  it("defaults id to 0 when not a number", () => {
    const raw = { id: "not-a-number", title: "Test" };
    const result = normalizeRawPost(raw);
    expect(result.id).toBe(0);
  });

  it("defaults date to undefined when not a string", () => {
    const raw = { id: 1, title: "Test", date: 12345 };
    const result = normalizeRawPost(raw);
    expect(result.date).toBeUndefined();
  });

  it("handles missing optional fields", () => {
    const raw = { id: 1, title: "Minimal" };
    const result = normalizeRawPost(raw);
    expect(result.content).toBeUndefined();
    expect(result.excerpt).toBeUndefined();
    expect(result.description).toBeUndefined();
    expect(result.caption).toBeUndefined();
    expect(result.name).toBeUndefined();
    expect(result.source_url).toBeUndefined();
    expect(result.media_type).toBeUndefined();
  });

  it("handles description and caption fields", () => {
    const raw = {
      id: 1,
      title: "Test",
      description: { rendered: "Desc" },
      caption: "Caption text",
    };
    const result = normalizeRawPost(raw);
    expect(result.description).toBe("Desc");
    expect(result.caption).toBe("Caption text");
  });

  it("preserves _embedded data", () => {
    const embedded = { author: [{ name: "Author" }] };
    const raw = { id: 1, title: "Test", _embedded: embedded };
    const result = normalizeRawPost(raw);
    expect(result._embedded).toEqual(embedded);
  });
});
