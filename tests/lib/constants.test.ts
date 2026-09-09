import { describe, it, expect } from "vitest";
import { CORS_PROXIES, MODEL_EXTENSIONS, CONTENT_TYPES, PER_PAGE_OPTIONS, SAMPLE_PRODUCTS, DRACO_CDN } from "@/lib/constants";

describe("constants", () => {
  it("has CORS proxies defined", () => {
    expect(CORS_PROXIES.length).toBeGreaterThanOrEqual(1);
    for (const proxy of CORS_PROXIES) expect(proxy).toMatch(/^https:\/\//);
  });

  it("has supported model extensions", () => {
    expect(MODEL_EXTENSIONS).toContain("glb");
    expect(MODEL_EXTENSIONS).toContain("gltf");
    expect(MODEL_EXTENSIONS).toContain("obj");
    expect(MODEL_EXTENSIONS).toContain("stl");
  });

  it("has content types matching WP REST API", () => {
    for (const t of ["posts", "pages", "categories", "tags", "media"]) expect(CONTENT_TYPES).toContain(t);
  });

  it("has per-page options", () => {
    for (const n of [10, 20, 50, 100]) expect(PER_PAGE_OPTIONS).toContain(n);
  });

  it("has 8 sample products with ids 1-8", () => {
    expect(SAMPLE_PRODUCTS).toHaveLength(8);
    for (let i = 0; i < 8; i++) {
      expect(SAMPLE_PRODUCTS[i]?.id).toBe(i + 1);
      expect(SAMPLE_PRODUCTS[i]?.price).toBeGreaterThan(0);
      expect(SAMPLE_PRODUCTS[i]?.icon).toBeTruthy();
    }
  });

  it("has Draco CDN URL", () => {
    expect(DRACO_CDN).toContain("cdn.jsdelivr.net");
    expect(DRACO_CDN).toContain("draco");
  });
});
