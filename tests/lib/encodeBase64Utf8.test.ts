import { describe, it, expect } from "vitest";
import { encodeBase64Utf8, wooAuthHeaders } from "@/lib/api";

/** Decode a Base64 string produced by encodeBase64Utf8 back to a JS string. */
function decodeBase64Utf8(b64: string): string {
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

describe("encodeBase64Utf8 (regression #575)", () => {
  it("is byte-identical to btoa() for ASCII input", () => {
    const input = "ck_abc123:cs_def456";
    expect(encodeBase64Utf8(input)).toBe(btoa(input));
  });

  it("encodes CJK and emoji without throwing and round-trips via UTF-8", () => {
    const input = "金鑰:秘密🔑";
    expect(() => encodeBase64Utf8(input)).not.toThrow();
    expect(decodeBase64Utf8(encodeBase64Utf8(input))).toBe(input);
  });

  it("does not throw on a lone surrogate", () => {
    expect(() => encodeBase64Utf8("\uD800")).not.toThrow();
  });

  it("returns empty string for empty input", () => {
    expect(encodeBase64Utf8("")).toBe("");
  });
});

describe("wooAuthHeaders with non-Latin-1 credentials (regression #575)", () => {
  it("returns a valid Basic header instead of throwing InvalidCharacterError", () => {
    const headers = wooAuthHeaders("金鑰", "秘密") as Record<string, string>;
    expect(headers.Authorization).toMatch(/^Basic [A-Za-z0-9+/]+=*$/);
    const encoded = headers.Authorization!.replace("Basic ", "");
    expect(decodeBase64Utf8(encoded)).toBe("金鑰:秘密");
  });

  it("keeps ASCII credential header unchanged", () => {
    const headers = wooAuthHeaders("ck_key", "cs_secret") as Record<string, string>;
    expect(headers.Authorization).toBe(`Basic ${btoa("ck_key:cs_secret")}`);
  });
});
