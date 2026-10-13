import { describe, it, expect } from "vitest";
import { CONTENT_TYPES } from "@/lib/constants";
import {
  getSortConfig,
  isTermContentType,
  resolveSortParams,
  toWpOrderby,
  WP_POST_ORDERBY,
  WP_TERM_ORDERBY,
} from "@/lib/wpSort";
import { zh } from "@/i18n/zh";
import { en } from "@/i18n/en";

// Regression #598: every sort option must map to an orderby the matching
// WP REST endpoint accepts. Adding an option without a valid mapping fails here.
describe("wpSort (regression #598)", () => {
  const types = [...CONTENT_TYPES];

  it("treats categories and tags as term types, posts/pages/media as post-like", () => {
    expect(isTermContentType("categories")).toBe(true);
    expect(isTermContentType("tags")).toBe(true);
    expect(isTermContentType("posts")).toBe(false);
    expect(isTermContentType("pages")).toBe(false);
    expect(isTermContentType("media")).toBe(false);
  });

  it.each(types)("%s: every option maps to an orderby its endpoint accepts", (contentType) => {
    const config = getSortConfig(contentType);
    const allowed: readonly string[] = isTermContentType(contentType) ? WP_TERM_ORDERBY : WP_POST_ORDERBY;
    expect(config.options.length).toBeGreaterThan(0);
    for (const opt of config.options) {
      const params = config.map[opt.value];
      expect(params, opt.value).toBeDefined();
      expect(allowed).toContain(params?.orderby);
      expect(["asc", "desc"]).toContain(params?.order);
    }
  });

  it.each(types)("%s: map keys and option values match one-to-one", (contentType) => {
    const config = getSortConfig(contentType);
    expect(Object.keys(config.map).sort()).toEqual(config.options.map((o) => o.value).sort());
  });

  it.each(types)("%s: default value is an option and defaultParams matches its mapping", (contentType) => {
    const config = getSortConfig(contentType);
    expect(config.options.map((o) => o.value)).toContain(config.defaultValue);
    expect(config.map[config.defaultValue]).toEqual(config.defaultParams);
  });

  it.each(types)("%s: every option has zh and en labels", (contentType) => {
    for (const opt of getSortConfig(contentType).options) {
      expect(zh[opt.labelKey], opt.labelKey).toBeTruthy();
      expect(en[opt.labelKey], opt.labelKey).toBeTruthy();
    }
  });

  it("resolveSortParams keeps a valid value for the content type", () => {
    expect(resolveSortParams("posts", "title_asc")).toEqual({ value: "title_asc", params: { orderby: "title", order: "asc" } });
    expect(resolveSortParams("tags", "count_desc")).toEqual({ value: "count_desc", params: { orderby: "count", order: "desc" } });
  });

  it("resolveSortParams falls back to the default for missing, foreign or inherited keys", () => {
    expect(resolveSortParams("categories", null)).toEqual({ value: "name_asc", params: { orderby: "name", order: "asc" } });
    expect(resolveSortParams("categories", "date_desc")).toEqual({ value: "name_asc", params: { orderby: "name", order: "asc" } });
    expect(resolveSortParams("posts", "count_desc")).toEqual({ value: "date_desc", params: { orderby: "date", order: "desc" } });
    expect(resolveSortParams("posts", "constructor")).toEqual({ value: "date_desc", params: { orderby: "date", order: "desc" } });
    expect(resolveSortParams("tags", "__proto__")).toEqual({ value: "name_asc", params: { orderby: "name", order: "asc" } });
  });

  it("toWpOrderby rewrites invalid term orderby to name and keeps valid ones", () => {
    expect(toWpOrderby("categories", "date")).toBe("name");
    expect(toWpOrderby("tags", "title")).toBe("name");
    expect(toWpOrderby("tags", "count")).toBe("count");
    expect(toWpOrderby("categories", "slug")).toBe("slug");
  });

  it("toWpOrderby leaves post-like content types untouched", () => {
    expect(toWpOrderby("posts", "date")).toBe("date");
    expect(toWpOrderby("pages", "title")).toBe("title");
    expect(toWpOrderby("media", "date")).toBe("date");
  });
});
