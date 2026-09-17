import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";
import { SkipToContent } from "@/components/layout/SkipToContent";

function withI18n(ui: React.ReactElement) {
  return <I18nProvider>{ui}</I18nProvider>;
}

describe("SkipToContent", () => {
  it("renders a skip link", () => {
    render(withI18n(<SkipToContent />));
    const link = screen.getByText("跳至主要內容");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "#main-content");
  });

  it("has sr-only class for screen reader accessibility", () => {
    render(withI18n(<SkipToContent />));
    const link = screen.getByText("跳至主要內容");
    expect(link.className).toContain("sr-only");
  });

  it("is an anchor element", () => {
    render(withI18n(<SkipToContent />));
    const link = screen.getByText("跳至主要內容");
    expect(link.tagName).toBe("A");
  });
});
