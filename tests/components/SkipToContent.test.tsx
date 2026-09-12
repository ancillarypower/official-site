import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SkipToContent } from "@/components/layout/SkipToContent";

describe("SkipToContent", () => {
  it("renders a skip link", () => {
    render(<SkipToContent />);
    const link = screen.getByText("Skip to content");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "#main-content");
  });

  it("has sr-only class for screen reader accessibility", () => {
    render(<SkipToContent />);
    const link = screen.getByText("Skip to content");
    expect(link.className).toContain("sr-only");
  });

  it("is an anchor element", () => {
    render(<SkipToContent />);
    const link = screen.getByText("Skip to content");
    expect(link.tagName).toBe("A");
  });
});
