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
    "wp:featuredmedia": [{ source_url: "https://example.com/hero.jpg" }],
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

  it("renders featured image", () => {
    const { container } = render(withProviders(<ArticleView post={fullPost} onBack={vi.fn()} />));
    const img = container.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/hero.jpg");
  });

  it("renders HTML content via dangerouslySetInnerHTML", () => {
    render(withProviders(<ArticleView post={fullPost} onBack={vi.fn()} />));
    expect(screen.getByText("Article content here")).toBeInTheDocument();
  });

  it("renders back button and calls onBack", () => {
    const handler = vi.fn();
    render(withProviders(<ArticleView post={fullPost} onBack={handler} />));
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
});
