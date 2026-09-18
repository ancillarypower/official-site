/**
 * Compute a SHA-256 hex digest for an ArrayBuffer using the Web Crypto API.
 * Returns a lowercase 64-character hex string.
 */
export async function computeFileHash(ab: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", ab);
  const bytes = new Uint8Array(hashBuffer);
  const hex: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    hex.push(bytes[i].toString(16).padStart(2, "0"));
  }
  return hex.join("");
}
