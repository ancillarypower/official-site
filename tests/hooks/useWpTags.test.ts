import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock settingsStore before importing the hook
const mockStore = { wpUrl: "https://example.com", contentType: "posts", useProxy: false };
vi.mock("@/stores/settingsStore", () => ({
  useSettingsStore: (selector: (s: typeof mockStore) => unknown) => selector(mockStore),
}));

// Mock fetchWithProxy and related API utilities
const mockFetch = vi.fn();
vi.mock("@/lib/api", () => ({
  fetchWithProxy: (...args: unknown[]) => mockFetch(...args),
  wpApiUrl: (url: string) => `${url}/wp-json/wp/v2`,
  parseJsonResponse: (res: Response) => res.json(),
}));

import { wpTagArraySchema } from "@/hooks/useWpTags";

describe("useWpTags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.wpUrl = "https://example.com";
    mockStore.contentType = "posts";
    mockStore.useProxy = false;
  });

  it("wpTagArraySchema parses valid tag array", () => {
    const input = [
      { id: 1, name: "React", count: 5 },
      { id: 2, name: "TypeScript", count: 3 },
      { id: 3, name: "Vite" },
    ];
    const result = wpTagArraySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toEqual({ id: 1, name: "React", count: 5 });
      expect(result.data[2]).toEqual({ id: 3, name: "Vite" });
    }
  });

  it("wpTagArraySchema rejects invalid entries", () => {
    const input = [
      { id: "not-a-number", name: "Bad" },
      { name: "Missing ID" },
    ];
    const result = wpTagArraySchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
