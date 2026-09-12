import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";
import { Pagination } from "@/components/ui/Pagination";

function renderPagination(props: {
  currentPage: number;
  totalPages: number;
  onPageChange?: ReturnType<typeof vi.fn>;
}) {
  const onPageChange = props.onPageChange ?? vi.fn();
  return {
    onPageChange,
    ...render(
      <I18nProvider>
        <Pagination
          currentPage={props.currentPage}
          totalPages={props.totalPages}
          onPageChange={onPageChange}
        />
      </I18nProvider>,
    ),
  };
}

describe("Pagination", () => {
  it("renders nothing when totalPages is 1", () => {
    const { container } = renderPagination({
      currentPage: 1,
      totalPages: 1,
    });
    expect(container.innerHTML).toBe("");
  });

  it("renders prev and next buttons", () => {
    renderPagination({ currentPage: 2, totalPages: 5 });
    expect(screen.getByText(/上一頁/)).toBeInTheDocument();
    expect(screen.getByText(/下一頁/)).toBeInTheDocument();
  });

  it("shows page indicator", () => {
    renderPagination({ currentPage: 3, totalPages: 10 });
    expect(screen.getByText("3/10")).toBeInTheDocument();
  });

  it("disables prev button on first page", () => {
    renderPagination({ currentPage: 1, totalPages: 5 });
    expect(screen.getByText(/上一頁/)).toBeDisabled();
  });

  it("disables next button on last page", () => {
    renderPagination({ currentPage: 5, totalPages: 5 });
    expect(screen.getByText(/下一頁/)).toBeDisabled();
  });

  it("calls onPageChange with previous page number", () => {
    const { onPageChange } = renderPagination({
      currentPage: 3,
      totalPages: 5,
    });
    fireEvent.click(screen.getByText(/上一頁/));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("calls onPageChange with next page number", () => {
    const { onPageChange } = renderPagination({
      currentPage: 3,
      totalPages: 5,
    });
    fireEvent.click(screen.getByText(/下一頁/));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });
});
