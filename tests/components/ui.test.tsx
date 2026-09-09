import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

function withI18n(ui: React.ReactElement) {
  return <I18nProvider>{ui}</I18nProvider>;
}

describe("EmptyState", () => {
  it("renders icon and title", () => {
    render(<EmptyState icon="📭" title="Nothing here" />);
    expect(screen.getByText("📭")).toBeInTheDocument();
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("renders optional description", () => {
    render(<EmptyState icon="⚠️" title="Error" description="Something went wrong" />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("omits description when not provided", () => {
    const { container } = render(<EmptyState icon="📭" title="Empty" />);
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });
});

describe("Pagination", () => {
  it("renders nothing when totalPages <= 1", () => {
    const { container } = render(withI18n(<Pagination currentPage={1} totalPages={1} onPageChange={vi.fn()} />));
    expect(container.innerHTML).toBe("");
  });

  it("renders prev/next buttons and page info", () => {
    render(withI18n(<Pagination currentPage={2} totalPages={5} onPageChange={vi.fn()} />));
    expect(screen.getByText("2/5")).toBeInTheDocument();
  });

  it("disables prev on first page", () => {
    render(withI18n(<Pagination currentPage={1} totalPages={3} onPageChange={vi.fn()} />));
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).not.toBeDisabled();
  });

  it("disables next on last page", () => {
    render(withI18n(<Pagination currentPage={3} totalPages={3} onPageChange={vi.fn()} />));
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).not.toBeDisabled();
    expect(buttons[1]).toBeDisabled();
  });

  it("calls onPageChange with correct page", () => {
    const handler = vi.fn();
    render(withI18n(<Pagination currentPage={2} totalPages={5} onPageChange={handler} />));
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]!);
    expect(handler).toHaveBeenCalledWith(1);
    fireEvent.click(buttons[1]!);
    expect(handler).toHaveBeenCalledWith(3);
  });
});

describe("LoadingSpinner", () => {
  it("renders with status role", () => {
    render(withI18n(<LoadingSpinner />));
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows loading text", () => {
    render(withI18n(<LoadingSpinner />));
    expect(screen.getByText("載入中...")).toBeInTheDocument();
  });
});
