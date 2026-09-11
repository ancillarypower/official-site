import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/context/I18nContext";
import { PostGrid } from "@/components/content/PostGrid";
import type { WpPost } from "@/lib/types";

function withProviders(ui: React.ReactElement) {
  return <MemoryRouter><I18nProvider>{ui}</I18nProvider></MemoryRouter>;
}

const posts: WpPost[] = [
  { id: 1, title: "First Post", date: "2026-01-01T00:00:00" },
  { id: 2, title: "Second Post", date: "2026-01-02T00:00:00" },
  { id: 3, title: "Third Post", date: "2026-01-03T00:00:00" },
];

describe("PostGrid", () => {
  it("renders all posts", () => {
    render(withProviders(<PostGrid posts={posts} onSelectPost={vi.fn()} />));
    expect(screen.getByText("First Post")).toBeInTheDocument();
    expect(screen.getByText("Second Post")).toBeInTheDocument();
    expect(screen.getByText("Third Post")).toBeInTheDocument();
  });

  it("calls onSelectPost with correct index", () => {
    const handler = vi.fn();
    render(withProviders(<PostGrid posts={posts} onSelectPost={handler} />));
    fireEvent.click(screen.getByText("Second Post").closest("[role=button]")!);
    expect(handler).toHaveBeenCalledWith(1);
  });

  it("renders empty grid when no posts", () => {
    const { container } = render(withProviders(<PostGrid posts={[]} onSelectPost={vi.fn()} />));
    expect(container.querySelectorAll("article")).toHaveLength(0);
  });
});
