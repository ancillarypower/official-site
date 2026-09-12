import { describe, it, expect } from "vitest";
import {
  CORS_PROXIES,
  DRACO_CDN,
  MODEL_EXTENSIONS,
  CONTENT_TYPES,
  PER_PAGE_OPTIONS,
  SAMPLE_PRODUCTS,
} from "@/lib/constants";

describe("constants", () => {
  it("CORS_PROXIES has at least one proxy", () => {
    expect(CORS_PROXIES.length).toBeGreaterThan(0);
    for (const proxy of CORS_PROXIES) {
      expect(proxy).toMatch(/^https:\/\//);
    }
  });

  it("DRACO_CDN is a valid URL", () => {
    expect(DRACO_CDN).toMatch(/^https:\/\//);
    expect(DRACO_CDN).toContain("draco");
  });

  it("MODEL_EXTENSIONS includes common 3D formats", () => {
    expect(MODEL_EXTENSIONS).toContain("glb");
    expect(MODEL_EXTENSIONS).toContain("gltf");
    expect(MODEL_EXTENSIONS).toContain("obj");
    expect(MODEL_EXTENSIONS).toContain("stl");
  });

  it("CONTENT_TYPES includes standard WP types", () => {
    expect(CONTENT_TYPES).toContain("posts");
    expect(CONTENT_TYPES).toContain("pages");
    expect(CONTENT_TYPES).toContain("media");
  });

  it("PER_PAGE_OPTIONS are all positive numbers", () => {
    for (const opt of PER_PAGE_OPTIONS) {
      expect(opt).toBeGreaterThan(0);
    }
  });

  it("SAMPLE_PRODUCTS have required fields", () => {
    expect(SAMPLE_PRODUCTS.length).toBeGreaterThan(0);
    for (const product of SAMPLE_PRODUCTS) {
      expect(product.id).toBeTypeOf("number");
      expect(product.price).toBeTypeOf("number");
      expect(product.icon).toBeTypeOf("string");
    }
  });

  it("SAMPLE_PRODUCTS have unique IDs", () => {
    const ids = SAMPLE_PRODUCTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
