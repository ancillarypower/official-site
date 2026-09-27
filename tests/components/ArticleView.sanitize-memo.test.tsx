import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/context/I18nContext";
import { ArticleView } from "@/components/content/ArticleView";
import DOMPurify from "dompurify";
import type { WpPost } from "@/lib/types";

function withProviders(ui: React.ReactElement) {
  return <MemoryRouter><I18nProvider>{ui}</I18nProvider></MemoryRouter>;
}

const post: WpPost = {
  id: 1,
  title: "Memo Test",
  content: "<p>Some HTML content for memoization test</p>",
};

describe("ArticleView sanitize memoization (regression #513)", () => {
  it("DOMPurify.sanitize is not re-called on unrelated re-render", () => {
    const spy = vi.spyOn(DOMPurify, "sanitize");

    const { rerender } = render(
      withProviders(<ArticleView post={post} onBack={vi.fn()} />),
    );

    const callsAfterMount = spy.mock.calls.length;
    expect(callsAfterMount).toBeGreaterThanOrEqual(1);

    // Re-render with the same post (same content) — simulates an
    // unrelated parent state change (theme toggle, sidebar, etc.)
    rerender(
      withProviders(<ArticleView post={post} onBack={vi.fn()} />),
    );

    expect(spy.mock.calls.length).toBe(callsAfterMount);

    spy.mockRestore();
  });
});
