import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/context/I18nContext";
import { PostCard } from "@/components/content/PostCard";
import type { WpPost } from "@/lib/types";

function withProviders(ui: React.ReactElement) {
  return <MemoryRouter><I18nProvider>{ui}</I18nProvider></MemoryRouter>;
}

const basePost: WpPost = {
  id: 1,
  title: "Test Post Title",
  date: "2026-01-15T10:00:00",
  _embedded: {
    author: [{ name: "Author Name" }],
    "wp:featuredmedia": [{ source_url: "https://example.com/img.jpg", alt_text: "A scenic landscape" }],
  },
};

describe("PostCard", () => {
  it("renders title and author", () => {
    render(withProviders(<PostCard post={basePost} onClick={vi.fn()} />));
    expect(screen.getByText("Test Post Title")).toBeInTheDocument();
    expect(screen.getByText("Author Name")).toBeInTheDocument();
  });

  it("renders featured image with alt text when available", () => {
    const { container } = render(withProviders(<PostCard post={basePost} onClick={vi.fn()} />));
    const img = container.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/img.jpg");
    expect(img).toHaveAttribute("alt", "A scenic landscape");
  });

  it("renders placeholder when no image", () => {
    const noImgPost: WpPost = { id: 2, title: "No Image" };
    const { container } = render(withProviders(<PostCard post={noImgPost} onClick={vi.fn()} />));
    expect(container.querySelector("img")).toBeNull();
  });

  it("calls onClick when clicked", () => {
    const handler = vi.fn();
    render(withProviders(<PostCard post={basePost} onClick={handler} />));
    fireEvent.click(screen.getByRole("button"));
    expect(handler).toHaveBeenCalledOnce();
  });

  it("calls onClick on Enter key", () => {
    const handler = vi.fn();
    render(withProviders(<PostCard post={basePost} onClick={handler} />));
    fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });
    expect(handler).toHaveBeenCalledOnce();
  });

  it("calls onClick on Space key", () => {
    const handler = vi.fn();
    render(withProviders(<PostCard post={basePost} onClick={handler} />));
    fireEvent.keyDown(screen.getByRole("button"), { key: " " });
    expect(handler).toHaveBeenCalledOnce();
  });

  it("renders formatted date", () => {
    render(withProviders(<PostCard post={basePost} onClick={vi.fn()} />));
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it("falls back to post name when title is empty", () => {
    const namePost: WpPost = { id: 3, title: "", name: "fallback-name" };
    render(withProviders(<PostCard post={namePost} onClick={vi.fn()} />));
    expect(screen.getByText("fallback-name")).toBeInTheDocument();
  });

  it("does not render date when post.date is undefined", () => {
    const noDatePost: WpPost = { id: 4, title: "No Date" };
    render(withProviders(<PostCard post={noDatePost} onClick={vi.fn()} />));
    expect(screen.getByText("No Date")).toBeInTheDocument();
  });

  it("uses post title as alt fallback when alt_text is missing (regression #118)", () => {
    const noAltPost: WpPost = {
      id: 5,
      title: "Fallback Alt Title",
      _embedded: {
        "wp:featuredmedia": [{ source_url: "https://example.com/no-alt.jpg" }],
      },
    };
    const { container } = render(withProviders(<PostCard post={noAltPost} onClick={vi.fn()} />));
    const img = container.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("alt", "Fallback Alt Title");
  });

  it("preserves article landmark while providing button interaction (regression #126)", () => {
    const { container } = render(withProviders(<PostCard post={basePost} onClick={vi.fn()} />));
    const article = container.querySelector("article");
    expect(article).toBeInTheDocument();
    expect(article).not.toHaveAttribute("role");
    const button = screen.getByRole("button");
    expect(article!.contains(button)).toBe(true);
  });

  it("button uses aria-labelledby instead of aria-label so inner text remains accessible (regression #544)", () => {
    render(withProviders(<PostCard post={basePost} onClick={vi.fn()} />));
    const button = screen.getByRole("button");
    expect(button).not.toHaveAttribute("aria-label");
    const labelledById = button.getAttribute("aria-labelledby");
    expect(labelledById).toBeTruthy();
    const h3 = document.getElementById(labelledById!);
    expect(h3).toBeInTheDocument();
    expect(h3!.tagName).toBe("H3");
    expect(h3!.textContent).toBe("Test Post Title");
  });

  it("renders width/height from media_details (regression #580)", () => {
    const sizedPost: WpPost = {
      id: 10,
      title: "Sized Image Post",
      _embedded: {
        "wp:featuredmedia": [{
          source_url: "https://example.com/hero.jpg",
          alt_text: "Hero",
          media_details: { width: 1200, height: 800 },
        }],
      },
    };
    const { container } = render(withProviders(<PostCard post={sizedPost} onClick={vi.fn()} />));
    const img = container.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("width", "1200");
    expect(img).toHaveAttribute("height", "800");
  });

  it("renders srcset from media_details.sizes (regression #580)", () => {
    const responsivePost: WpPost = {
      id: 11,
      title: "Responsive Image Post",
      _embedded: {
        "wp:featuredmedia": [{
          source_url: "https://example.com/full.jpg",
          alt_text: "Responsive",
          media_details: {
            width: 1600,
            height: 900,
            sizes: {
              medium: { source_url: "https://example.com/med.jpg", width: 300, height: 169 },
              large: { source_url: "https://example.com/lrg.jpg", width: 1024, height: 576 },
            },
          },
        }],
      },
    };
    const { container } = render(withProviders(<PostCard post={responsivePost} onClick={vi.fn()} />));
    const img = container.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("srcset");
    const srcset = img!.getAttribute("srcset")!;
    expect(srcset).toContain("med.jpg 300w");
    expect(srcset).toContain("lrg.jpg 1024w");
    expect(img).toHaveAttribute("sizes");
  });
});
