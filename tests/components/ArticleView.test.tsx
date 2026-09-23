import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/context/I18nContext";
import { ArticleView } from "@/components/content/ArticleView";
import type { WpPost } from "@/lib/types";

function withProviders(ui: React.ReactElement) {
  return <MemoryRouter><I18nProvider>{ui}</I18nProvider></MemoryRouter>;
}

const fullPost: WpPost = {
  id: 1,
  title: "Article Title",
  date: "2026-03-15T10:00:00",
  content: "<p>Article content here</p>",
  _embedded: {
    author: [{ name: "Author" }],
    "wp:featuredmedia": [{ source_url: "https://example.com/hero.jpg", alt_text: "Hero image" }],
    "wp:term": [[{ name: "Tech" }, { name: "News" }]],
  },
};

describe("ArticleView", () => {
  it("renders article title", () => {
    render(withProviders(<ArticleView post={fullPost} onBack={vi.fn()} />));
    expect(screen.getByText("Article Title")).toBeInTheDocument();
  });

  it("renders author and date", () => {
    render(withProviders(<ArticleView post={fullPost} onBack={vi.fn()} />));
    expect(screen.getByText(/Author/)).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it("renders categories", () => {
    render(withProviders(<ArticleView post={fullPost} onBack={vi.fn()} />));
    expect(screen.getByText("Tech")).toBeInTheDocument();
    expect(screen.getByText("News")).toBeInTheDocument();
  });

  it("renders featured image with alt text", () => {
    const { container } = render(withProviders(<ArticleView post={fullPost} onBack={vi.fn()} />));
    const img = container.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/hero.jpg");
    expect(img).toHaveAttribute("alt", "Hero image");
  });

  it("renders HTML content via dangerouslySetInnerHTML", () => {
    render(withProviders(<ArticleView post={fullPost} onBack={vi.fn()} />));
    expect(screen.getByText("Article content here")).toBeInTheDocument();
  });

  it("renders original article link when post.link is present (regression #155)", () => {
    const linkedPost: WpPost = {
      ...fullPost,
      link: "https://example.com/original-article",
    };

    render(withProviders(<ArticleView post={linkedPost} onBack={vi.fn()} />));

    const originalLink = screen.getByRole("link", {
      name: /查看原始文章/,
    });
    expect(originalLink).toBeInTheDocument();
    expect(originalLink).toHaveAttribute("href", "https://example.com/original-article");
    expect(originalLink).toHaveAttribute("target", "_blank");
    expect(originalLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("does not render original article link when post.link is absent (regression #155)", () => {
    render(withProviders(<ArticleView post={fullPost} onBack={vi.fn()} />));
    expect(screen.queryByRole("link", { name: /查看原始文章/ })).not.toBeInTheDocument();
  });

  it("does not render original article link for unsafe schemes (regression #155)", () => {
    const unsafeLinkPost: WpPost = {
      ...fullPost,
      link: "javascript:alert(1)",
    };

    render(withProviders(<ArticleView post={unsafeLinkPost} onBack={vi.fn()} />));

    expect(screen.queryByRole("link", { name: /查看原始文章/ })).not.toBeInTheDocument();
  });

  it("renders back button and calls onBack", () => {
    const handler = vi.fn();
    render(withProviders(<ArticleView post={handler} onBack={handler} />));
    const btn = screen.getByText(/\u8fd4\u56de\u5217\u8868/);
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("handles post with no image, no author, no date, no categories", () => {
    const minPost: WpPost = { id: 2, title: "Minimal" };
    const { container } = render(withProviders(<ArticleView post={minPost} onBack={vi.fn()} />));
    expect(screen.getByText("Minimal")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("uses description as fallback content", () => {
    const descPost: WpPost = { id: 3, title: "Desc", description: "<p>Description text</p>" };
    render(withProviders(<ArticleView post={descPost} onBack={vi.fn()} />));
    expect(screen.getByText("Description text")).toBeInTheDocument();
  });

  it("uses excerpt as fallback content", () => {
    const excerptPost: WpPost = { id: 4, title: "Excerpt", excerpt: "<p>Excerpt text</p>" };
    render(withProviders(<ArticleView post={excerptPost} onBack={vi.fn()} />));
    expect(screen.getByText("Excerpt text")).toBeInTheDocument();
  });

  it("uses caption as fallback content", () => {
    const captionPost: WpPost = { id: 5, title: "Caption", caption: "<p>Caption text</p>" };
    render(withProviders(<ArticleView post={captionPost} onBack={vi.fn()} />));
    expect(screen.getByText("Caption text")).toBeInTheDocument();
  });

  it("sanitizes malicious HTML content (XSS regression #41)", () => {
    const xssPost: WpPost = {
      id: 99,
      title: "XSS Test",
      content: '<p>Safe content</p><script>alert("xss")</script><img src=x onerror=alert(1)><iframe src="https://evil.com"></iframe>',
    };
    const { container } = render(withProviders(<ArticleView post={xssPost} onBack={vi.fn()} />));
    const articleBody = container.querySelector(".article-body");
    expect(articleBody).toBeInTheDocument();
    expect(articleBody!.innerHTML).not.toContain("<script");
    expect(articleBody!.innerHTML).not.toContain("onerror");
    expect(articleBody!.innerHTML).not.toContain("<iframe");
    expect(articleBody!.innerHTML).toContain("Safe content");
  });

  it("strips event handlers from WordPress HTML (XSS regression #41)", () => {
    const eventPost: WpPost = {
      id: 100,
      title: "Event Handler XSS",
      content: '<div onmouseover="steal()">Hover me</div><a href="javascript:void(0)">Click</a><p>Normal paragraph</p>',
    };
    const { container } = render(withProviders(<ArticleView post={eventPost} onBack={vi.fn()} />));
    const articleBody = container.querySelector(".article-body");
    expect(articleBody).toBeInTheDocument();
    expect(articleBody!.innerHTML).not.toContain("onmouseover");
    expect(articleBody!.innerHTML).not.toContain("javascript:");
    expect(articleBody!.innerHTML).toContain("Normal paragraph");
  });

  it("decodes HTML entities in title (regression #83)", () => {
    const entityPost: WpPost = {
      id: 101,
      title: "Q&amp;A Column &lt;Special&gt; &#8217;Quotes&#8217;",
    };
    render(withProviders(<ArticleView post={entityPost} onBack={vi.fn()} />));
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toBe("Q&A Column <Special> \u2019Quotes\u2019");
  });

  it("uses post title as alt fallback when alt_text is missing (regression #118)", () => {
    const noAltPost: WpPost = {
      id: 102,
      title: "Fallback Alt Article",
      content: "<p>Some content</p>",
      _embedded: {
        "wp:featuredmedia": [{ source_url: "https://example.com/no-alt.jpg" }],
      },
    };
    const { container } = render(withProviders(<ArticleView post={noAltPost} onBack={vi.fn()} />));
    const img = container.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("alt", "Fallback Alt Article");
  });

  it("auto-focuses article title on mount (regression #149)", () => {
    render(withProviders(<ArticleView post={fullPost} onBack={vi.fn()} />));
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveFocus();
    expect(h1.getAttribute("tabindex")).toBe("-1");
  });

  it("strips style tags and style attributes from content (regression #211)", () => {
    const cssInjectionPost: WpPost = {
      id: 211,
      title: "CSS Injection Test",
      content: '<style>body{display:none}</style><p style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999">overlay</p><p>Safe paragraph</p>',
    };
    const { container } = render(withProviders(<ArticleView post={cssInjectionPost} onBack={vi.fn()} />));
    const articleBody = container.querySelector(".article-body");
    expect(articleBody).toBeInTheDocument();
    expect(articleBody!.innerHTML).not.toContain("<style");
    expect(articleBody!.innerHTML).not.toContain("style=");
    expect(articleBody!.innerHTML).toContain("Safe paragraph");
  });

  it("strips form and input tags from content (regression #211)", () => {
    const formSpoofPost: WpPost = {
      id: 212,
      title: "Form Spoofing Test",
      content: '<form action="https://evil.com/steal"><input type="text" name="password" placeholder="Enter password"><button type="submit">Login</button><select><option>A</option></select><textarea>notes</textarea><fieldset><legend>Info</legend></fieldset></form><p>Safe paragraph</p>',
    };
    const { container } = render(withProviders(<ArticleView post={formSpoofPost} onBack={vi.fn()} />));
    const articleBody = container.querySelector(".article-body");
    expect(articleBody).toBeInTheDocument();
    expect(articleBody!.innerHTML).not.toContain("<form");
    expect(articleBody!.innerHTML).not.toContain("<input");
    expect(articleBody!.innerHTML).not.toContain("<button");
    expect(articleBody!.innerHTML).not.toContain("<select");
    expect(articleBody!.innerHTML).not.toContain("<textarea");
    expect(articleBody!.innerHTML).not.toContain("<fieldset");
    expect(articleBody!.innerHTML).toContain("Safe paragraph");
  });

  it("hero image uses eager loading and high fetch priority (regression #268)", () => {
    const { container } = render(withProviders(<ArticleView post={fullPost} onBack={vi.fn()} />));
    const img = container.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("fetchPriority", "high");
  });

  it("renders share buttons section at bottom of article (regression #424)", () => {
    render(withProviders(<ArticleView post={fullPost} onBack={vi.fn()} />));
    expect(screen.getByText(/\u5206\u4eab\u9019\u7bc7\u6587\u7ae0/)).toBeInTheDocument();
    expect(screen.getByText(/\u8907\u88fd\u9023\u7d50/)).toBeInTheDocument();
  });

  it("copy link button writes URL to clipboard (regression #424)", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(withProviders(<ArticleView post={fullPost} onBack={vi.fn()} />));
    const copyBtn = screen.getByText(/\u8907\u88fd\u9023\u7d50/);
    fireEvent.click(copyBtn);
    expect(writeText).toHaveBeenCalledOnce();
  });

  it("renders social share links with correct href (regression #424)", () => {
    const { container } = render(withProviders(<ArticleView post={fullPost} onBack={vi.fn()} />));
    const externalLinks = container.querySelectorAll('a[target="_blank"]');
    const hrefs = Array.from(externalLinks).map((a) => a.getAttribute("href") || "");
    expect(hrefs.some((h) => h.includes("facebook.com/sharer"))).toBe(true);
    expect(hrefs.some((h) => h.includes("twitter.com/intent/tweet"))).toBe(true);
    expect(hrefs.some((h) => h.includes("line.me/lineit/share"))).toBe(true);
  });
});
