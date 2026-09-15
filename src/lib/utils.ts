/**
 * Decode HTML entities (e.g. `&amp;` → `&`, `&#8217;` → `'`) using the
 * browser's built-in parser.  Works in any DOM environment (browser + jsdom).
 */
export function decodeHtml(html: string): string {
  const el = document.createElement("textarea");
  el.innerHTML = html;
  return el.value;
}
