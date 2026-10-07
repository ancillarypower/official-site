import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/context/I18nContext";
import { PostCard } from "@/components/content/PostCard";
import { ArticleView } from "@/components/content/ArticleView";
import { getPostTitle } from "@/lib/types";

/**
 * Regression tests for #594: titles must be decoded exactly once.
 *
 * `getPostTitle()` already runs `decodeHtml()`. Because `decodeHtml()` is NOT
 * idempotent (each call strips one entity layer), a second decode in the
 * component changes what the reader sees:
 *   - `&amp;lt;` (a title that literally shows "&lt;") would render as "<"
 *   - `&amp;#9999999;` would make the second pass call
 *     `String.fromCodePoint(9999999)` and throw `RangeError`
 */

function withProviders(ui: React.ReactElement) {
  return <MemoryRouter><I18nProvider>{ui}</I18nProvider></MemoryRouter>;
}

/** WordPress-encoded form of the literal text `Learn &lt;b&gt; tags`. */
const LITERAL_ENTITY_TITLE = "Learn &amp;lt;b&amp;gt; tags";
const LITERAL_ENTITY_DISPLAY = "Learn &lt;b&gt; tags";

/** WordPress-encoded form of the literal text `Code &#9999999;`. */
const OUT_OF_RANGE_TITLE = "Code &amp;#9999999;";
const OUT_OF_RANGE_DISPLAY = "Code &#9999999;";

describe("title decoding happens exactly once (regression #594)", () => {
  it("getPostTitle decodes a single entity layer", () => {
    expect(getPostTitle({ id: 1, title: LITERAL_ENTITY_TITLE })).toBe(LITERAL_ENTITY_DISPLAY);
  });

  it("PostCard renders a literal entity title without decoding it again", () => {
    render(withProviders(<PostCard post={{ id: 594, title: LITERAL_ENTITY_TITLE }} onClick={vi.fn()} />));
    const h3 = screen.getByRole("heading", { level: 3 });
    expect(h3.textContent).toBe(LITERAL_ENTITY_DISPLAY);
  });

  it("ArticleView renders a literal entity title without decoding it again", () => {
    render(withProviders(<ArticleView post={{ id: 594, title: LITERAL_ENTITY_TITLE }} onBack={vi.fn()} />));
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toBe(LITERAL_ENTITY_DISPLAY);
  });

  it("ArticleView passes the singly-decoded title to ShareButtons", () => {
    const { container } = render(
      withProviders(<ArticleView post={{ id: 594, title: LITERAL_ENTITY_TITLE }} onBack={vi.fn()} />),
    );
    const tweet = container.querySelector('a[href*="twitter.com/intent/tweet"]');
    expect(tweet).toBeInTheDocument();
    expect(tweet!.getAttribute("href")).toContain(`text=${encodeURIComponent(LITERAL_ENTITY_DISPLAY)}`);
  });

  it("PostCard does not crash on a title that literally contains an out-of-range numeric entity", () => {
    render(withProviders(<PostCard post={{ id: 595, title: OUT_OF_RANGE_TITLE }} onClick={vi.fn()} />));
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe(OUT_OF_RANGE_DISPLAY);
  });

  it("ArticleView does not crash on a title that literally contains an out-of-range numeric entity", () => {
    render(withProviders(<ArticleView post={{ id: 595, title: OUT_OF_RANGE_TITLE }} onBack={vi.fn()} />));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(OUT_OF_RANGE_DISPLAY);
  });

  it("ordinary encoded titles still decode once (Q&amp;A -> Q&A)", () => {
    render(withProviders(<PostCard post={{ id: 596, title: "Q&amp;A &#8217;Quotes&#8217;" }} onClick={vi.fn()} />));
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("Q&A \u2019Quotes\u2019");
  });
});
