import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/ui/EmptyState";

describe("EmptyState", () => {
  it("renders icon and title", () => {
    render(<EmptyState icon="📦" title="Nothing here" />);
    expect(screen.getByText("📦")).toBeInTheDocument();
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(
      <EmptyState
        icon="📦"
        title="Empty"
        description="Try adding something"
      />,
    );
    expect(screen.getByText("Try adding something")).toBeInTheDocument();
  });

  it("does not render description paragraph when omitted", () => {
    const { container } = render(
      <EmptyState icon="📦" title="Empty" />,
    );
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });

  it("renders title as h2", () => {
    render(<EmptyState icon="🔍" title="Search" />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Search",
    );
  });
});
