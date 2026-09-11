import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/ui/EmptyState";

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

  it("does not render description when not provided", () => {
    const { container } = render(<EmptyState icon="📭" title="Empty" />);
    expect(container.querySelector("p")).toBeNull();
  });
});
