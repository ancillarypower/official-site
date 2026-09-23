import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TagFilter } from "@/components/ui/TagFilter";
import type { WpTag } from "@/hooks/useWpTags";

// Mock i18n
vi.mock("@/context/I18nContext", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    lang: "zh",
  }),
}));

const sampleTags: WpTag[] = [
  { id: 1, name: "React", count: 5 },
  { id: 2, name: "TypeScript", count: 3 },
  { id: 3, name: "Vite", count: 1 },
];

describe("TagFilter", () => {
  it("renders tag chips with names and counts", () => {
    render(
      <TagFilter
        tags={sampleTags}
        selectedIds={[]}
        onToggle={() => {}}
        onClear={() => {}}
      />,
    );

    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Vite")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("calls onToggle with correct tag ID on click", () => {
    const onToggle = vi.fn();
    render(
      <TagFilter
        tags={sampleTags}
        selectedIds={[]}
        onToggle={onToggle}
        onClear={() => {}}
      />,
    );

    fireEvent.click(screen.getByText("TypeScript"));
    expect(onToggle).toHaveBeenCalledWith(2);
  });

  it("shows clear button when tags are selected and calls onClear", () => {
    const onClear = vi.fn();
    render(
      <TagFilter
        tags={sampleTags}
        selectedIds={[1, 3]}
        onToggle={() => {}}
        onClear={onClear}
      />,
    );

    const clearBtn = screen.getByText(/tag_filter_clear/);
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("does not render clear button when no tags selected", () => {
    render(
      <TagFilter
        tags={sampleTags}
        selectedIds={[]}
        onToggle={() => {}}
        onClear={() => {}}
      />,
    );

    expect(screen.queryByText(/tag_filter_clear/)).not.toBeInTheDocument();
  });

  it("returns null when tags array is empty", () => {
    const { container } = render(
      <TagFilter
        tags={[]}
        selectedIds={[]}
        onToggle={() => {}}
        onClear={() => {}}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("marks selected tags with aria-pressed=true", () => {
    render(
      <TagFilter
        tags={sampleTags}
        selectedIds={[2]}
        onToggle={() => {}}
        onClear={() => {}}
      />,
    );

    const reactBtn = screen.getByText("React").closest("button");
    const tsBtn = screen.getByText("TypeScript").closest("button");
    expect(reactBtn).toHaveAttribute("aria-pressed", "false");
    expect(tsBtn).toHaveAttribute("aria-pressed", "true");
  });
});
