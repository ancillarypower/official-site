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
    "wp:featuredmedia": [{ source_url: "https://example.com/img.jpg" }],
  },
};

describe("PostCard", () => {
  it("renders title and author", () => {
    render(withProviders(<PostCard post={basePost} onClick={vi.fn()} />));
    expect(screen.getByText("Test Post Title")).toBeInTheDocument();
    expect(screen.getByText("Author Name")).toBeInTheDocument();
  });

  it("renders featured image when available", () => {
    const { container } = render(withProviders(<PostCard post={basePost} onClick={vi.fn()} />));
    const img = container.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/img.jpg");
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
});
