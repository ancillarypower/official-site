import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TagFilter } from "@/components/ui/TagFilter";
import type { WpTag } from "@/hooks/useWpTags";

// Mock i18n
vi.mock("@/context/I18nContext", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === "tag_filter_selected" && params?.n != null) return `${params.n} tag(s) selected`;
      return key;
    },
    lang: "zh",
  }),
}));

const sampleTags: WpTag[] = [
  { id: 1, name: "React", count: 5 },
  { id: 2, name: "TypeScript", count: 3 },
  { id: 3, name: "Vite", count: 1 },
];

describe("TagFilter", () => {
  it("renders trigger button with placeholder when no tags selected", () => {
    render(
      <TagFilter
        tags={sampleTags}
        selectedIds={[]}
        onToggle={() => {}}
        onClear={() => {}}
      />,
    );

    const trigger = screen.getByRole("button", { name: /tag_filter_label/ });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent("tag_filter_placeholder");
  });

  it("opens dropdown on trigger click and shows tag checkboxes", () => {
    render(
      <TagFilter
        tags={sampleTags}
        selectedIds={[]}
        onToggle={() => {}}
        onClear={() => {}}
      />,
    );

    const trigger = screen.getByRole("button", { name: /tag_filter_label/ });
    fireEvent.click(trigger);

    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Vite")).toBeInTheDocument();
    // Checkboxes should be present
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(3);
  });

  it("calls onToggle with correct tag ID on checkbox change", () => {
    const onToggle = vi.fn();
    render(
      <TagFilter
        tags={sampleTags}
        selectedIds={[]}
        onToggle={onToggle}
        onClear={() => {}}
      />,
    );

    // Open dropdown first
    fireEvent.click(screen.getByRole("button", { name: /tag_filter_label/ }));

    const checkboxes = screen.getAllByRole("checkbox");
    // TypeScript is the second tag (index 1)
    fireEvent.click(checkboxes[1]);
    expect(onToggle).toHaveBeenCalledWith(2);
  });

  it("shows clear button in dropdown when tags are selected and calls onClear", () => {
    const onClear = vi.fn();
    render(
      <TagFilter
        tags={sampleTags}
        selectedIds={[1, 3]}
        onToggle={() => {}}
        onClear={onClear}
      />,
    );

    // Open dropdown
    fireEvent.click(screen.getByRole("button", { name: /tag_filter_label/ }));

    const clearBtn = screen.getByRole("button", { name: /tag_filter_clear/ });
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalledOnce();
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

  it("marks selected tags with checked checkboxes", () => {
    render(
      <TagFilter
        tags={sampleTags}
        selectedIds={[2]}
        onToggle={() => {}}
        onClear={() => {}}
      />,
    );

    // Open dropdown
    fireEvent.click(screen.getByRole("button", { name: /tag_filter_label/ }));

    const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    expect(checkboxes[0].checked).toBe(false); // React
    expect(checkboxes[1].checked).toBe(true);  // TypeScript
    expect(checkboxes[2].checked).toBe(false); // Vite
  });

  it("closes dropdown on Escape key and returns focus to trigger (regression #497)", () => {
    render(
      <TagFilter
        tags={sampleTags}
        selectedIds={[]}
        onToggle={() => {}}
        onClear={() => {}}
      />,
    );

    const trigger = screen.getByRole("button", { name: /tag_filter_label/ });
    fireEvent.click(trigger);

    // Dropdown should be open
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);

    // Press Escape
    fireEvent.keyDown(document, { key: "Escape" });

    // Dropdown should be closed
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    // Focus should return to trigger
    expect(document.activeElement).toBe(trigger);
  });

  it("closes dropdown on click outside (regression #497)", () => {
    render(
      <TagFilter
        tags={sampleTags}
        selectedIds={[]}
        onToggle={() => {}}
        onClear={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /tag_filter_label/ }));
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);

    // Click outside
    fireEvent.mouseDown(document.body);

    // Dropdown should be closed
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("displays selected count in trigger button (regression #497)", () => {
    render(
      <TagFilter
        tags={sampleTags}
        selectedIds={[1, 3]}
        onToggle={() => {}}
        onClear={() => {}}
      />,
    );

    const trigger = screen.getByRole("button", { name: /tag_filter_label/ });
    expect(trigger).toHaveTextContent("2 tag(s) selected");
  });
});
