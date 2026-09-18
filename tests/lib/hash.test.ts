import { describe, it, expect } from "vitest";
import { computeFileHash } from "@/lib/hash";

describe("computeFileHash", () => {
  it("returns consistent SHA-256 hex for same input", async () => {
    const data = new TextEncoder().encode("hello world").buffer;
    const hash1 = await computeFileHash(data);
    const hash2 = await computeFileHash(data);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns different hash for different input", async () => {
    const data1 = new TextEncoder().encode("file content A").buffer;
    const data2 = new TextEncoder().encode("file content B").buffer;
    const hash1 = await computeFileHash(data1);
    const hash2 = await computeFileHash(data2);
    expect(hash1).not.toBe(hash2);
  });
});
