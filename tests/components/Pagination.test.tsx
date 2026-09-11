import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";
import { Pagination } from "@/components/ui/Pagination";

function withI18n(ui: React.ReactElement) {
  return <I18nProvider>{ui}</I18nProvider>;
}

describe("Pagination", () => {
  it("returns null when totalPages is 1", () => {
    const { container } = render(
      withI18n(<Pagination currentPage={1} totalPages={1} onPageChange={vi.fn()} />)
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders page info and buttons", () => {
    render(withI18n(<Pagination currentPage={2} totalPages={5} onPageChange={vi.fn()} />));
    expect(screen.getByText("2/5")).toBeInTheDocument();
    expect(screen.getByText("← 上一頁")).toBeInTheDocument();
    expect(screen.getByText("下一頁 →")).toBeInTheDocument();
  });

  it("disables prev button on first page", () => {
    render(withI18n(<Pagination currentPage={1} totalPages={3} onPageChange={vi.fn()} />));
    expect(screen.getByText("← 上一頁")).toBeDisabled();
    expect(screen.getByText("下一頁 →")).not.toBeDisabled();
  });

  it("disables next button on last page", () => {
    render(withI18n(<Pagination currentPage={3} totalPages={3} onPageChange={vi.fn()} />));
    expect(screen.getByText("← 上一頁")).not.toBeDisabled();
    expect(screen.getByText("下一頁 →")).toBeDisabled();
  });

  it("calls onPageChange with correct values", () => {
    const handler = vi.fn();
    render(withI18n(<Pagination currentPage={2} totalPages={5} onPageChange={handler} />));
    fireEvent.click(screen.getByText("← 上一頁"));
    expect(handler).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByText("下一頁 →"));
    expect(handler).toHaveBeenCalledWith(3);
  });
});
