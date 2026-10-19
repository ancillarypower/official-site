/**
 * Generate a client-side order reference.
 *
 * Sent as the `_client_order_ref` order meta on POST /orders and reused
 * when the user resubmits after an unknown outcome, so support can match
 * a possible duplicate order to the attempt that timed out (#601).
 *
 * `crypto.randomUUID()` only exists in secure contexts, so fall back to
 * `getRandomValues()` and finally to a time-based value.
 */
export function createClientOrderRef(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  if (c && typeof c.getRandomValues === "function") {
    const bytes = c.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
