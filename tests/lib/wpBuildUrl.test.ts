import { describe, expect, it } from "vitest";
import { wpBuildUrl } from "@/lib/api";

describe("wpBuildUrl", () => {
  it("builds a WordPress endpoint with query parameters", () => {
    const parsed = new URL(wpBuildUrl("https://example.com/wp-json/wp/v2", "posts", {
      per_page: "10",
      page: "1",
      _embed: "",
      orderby: "date",
    }));

    expect(parsed.pathname).toBe("/wp-json/wp/v2/posts");
    expect(parsed.searchParams.get("per_page")).toBe("10");
    expect(parsed.searchParams.get("_embed")).toBe("");
    expect(parsed.searchParams.get("orderby")).toBe("date");
  });

  it("omits parameters that are not provided", () => {
    const parsed = new URL(wpBuildUrl("https://example.com/wp-json/wp/v2", "posts", { page: "1" }));
    expect(parsed.searchParams.has("search")).toBe(false);
    expect(parsed.searchParams.has("tags")).toBe(false);
  });

  it("encodes special characters while preserving decoded values", () => {
    const value = "a & b = c";
    const url = wpBuildUrl("https://example.com/wp-json/wp/v2", "posts", { search: value, tags: "1,2" });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("search")).toBe(value);
    expect(parsed.searchParams.get("tags")).toBe("1,2");
    expect(url).toContain("search=a+%26+b+%3D+c");
  });
});
