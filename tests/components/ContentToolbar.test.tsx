import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";
import { ContentToolbar } from "@/components/ui/ContentToolbar";

const SORT_OPTIONS = [
  { value: "date_desc", labelKey: "sort_date_desc" },
  { value: "title_asc", labelKey: "sort_title_asc" },
];

function renderToolbar(overrides = {}) {
  const defaults = {
    filterValue: "",
    onFilterChange: vi.fn(),
    sortValue: "date_desc",
    onSortChange: vi.fn(),
    sortOptions: SORT_OPTIONS,
  };
  const props = { ...defaults, ...overrides };
  return {
    ...render(
      <I18nProvider>
        <ContentToolbar {...props} />
      </I18nProvider>,
    ),
    props,
  };
}

describe("ContentToolbar", () => {
  it("renders filter input and sort select", () => {
    renderToolbar();
    expect(screen.getByLabelText("Filter")).toBeInTheDocument();
    expect(screen.getByLabelText("Sort by")).toBeInTheDocument();
  });

  it("calls onFilterChange when typing", () => {
    const { props } = renderToolbar();
    fireEvent.change(screen.getByLabelText("Filter"), {
      target: { value: "hello" },
    });
    expect(props.onFilterChange).toHaveBeenCalledWith("hello");
  });

  it("calls onSortChange when selecting", () => {
    const { props } = renderToolbar();
    fireEvent.change(screen.getByLabelText("Sort by"), {
      target: { value: "title_asc" },
    });
    expect(props.onSortChange).toHaveBeenCalledWith("title_asc");
  });

  it("renders sort options with translated labels", () => {
    renderToolbar();
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0]?.textContent).toBe("日期（新→舊）");
    expect(options[1]?.textContent).toBe("標題 A→Z");
  });

  it("shows current filter value", () => {
    renderToolbar({ filterValue: "search term" });
    expect(screen.getByLabelText("Filter")).toHaveValue("search term");
  });
});
