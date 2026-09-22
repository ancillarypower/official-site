import DOMPurify from "dompurify";

/**
 * Common HTML named entities lookup table.
 * Covers the most frequent entities found in WordPress REST API output
 * (titles, excerpts, descriptions).
 */
const NAMED_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#039;": "'",
  "&nbsp;": "\u00A0",
  "&copy;": "\u00A9",
  "&reg;": "\u00AE",
  "&trade;": "\u2122",
  "&hellip;": "\u2026",
  "&mdash;": "\u2014",
  "&ndash;": "\u2013",
  "&laquo;": "\u00AB",
  "&raquo;": "\u00BB",
  "&lsquo;": "\u2018",
  "&rsquo;": "\u2019",
  "&ldquo;": "\u201C",
  "&rdquo;": "\u201D",
};

/**
 * Matches three entity patterns:
 * 1. Decimal numeric: &#123;
 * 2. Hex numeric:     &#x1F4A9;
 * 3. Named:           &amp;
 */
const ENTITY_RE = /&#(\d+);|&#x([\da-fA-F]+);|&([a-zA-Z][a-zA-Z0-9]*);/g;

/**
 * Decode HTML entities using a pure function (no DOM dependency).
 * Safe for React Concurrent Mode render phase and SSR environments.
 *
 * Supports all decimal/hex numeric entities via String.fromCodePoint
 * and common named entities via a lookup table.
 * Unknown named entities are preserved as-is.
 */
export function decodeHtml(html: string): string {
  if (!html) return "";

  // Also handle &#039; which is a common WordPress encoding for apostrophe
  // but doesn't match the named entity regex group
  return html.replace(ENTITY_RE, (match, decimal, hex, named) => {
    if (decimal !== undefined) {
      return String.fromCodePoint(Number(decimal));
    }
    if (hex !== undefined) {
      return String.fromCodePoint(Number.parseInt(hex, 16));
    }
    // Named entity: look up with surrounding & and ;
    const key = `&${named};`;
    return NAMED_ENTITIES[key] ?? match;
  });
}

/**
 * Strip HTML tags from a string using DOM parsing.
 *
 * Uses DOMPurify to sanitize the input first (defense in depth),
 * then extracts text content via the DOM. This correctly handles
 * all HTML structures including attributes containing `>`, unclosed
 * tags, and nested special characters -- unlike the regex anti-pattern
 * `/<[^>]*>/g` which silently corrupts such input (Issue #299).
 *
 * The DOM's `textContent` property also decodes HTML entities
 * automatically, so a separate `decodeHtml()` call is unnecessary.
 */
export function stripHtml(html: string): string {
  if (!html) return "";
  const el = document.createElement("div");
  el.innerHTML = DOMPurify.sanitize(html);
  return el.textContent ?? "";
}
