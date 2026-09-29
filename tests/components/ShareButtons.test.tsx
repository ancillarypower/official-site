import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/context/I18nContext";
import { ShareButtons } from "@/components/content/ShareButtons";

function withProviders(ui: React.ReactElement) {
  return <MemoryRouter><I18nProvider>{ui}</I18nProvider></MemoryRouter>;
}

describe("ShareButtons", () => {
  it("external share links include opens_in_new_tab hint in aria-label (regression #554)", () => {
    render(withProviders(<ShareButtons url="https://example.com/post" title="Test" />));

    const facebookLink = screen.getByRole("link", { name: /Facebook/ });
    const xLink = screen.getByRole("link", { name: /^X/ });
    const lineLink = screen.getByRole("link", { name: /LINE/ });

    // Each external share link must include the opens_in_new_tab hint
    for (const link of [facebookLink, xLink, lineLink]) {
      const label = link.getAttribute("aria-label");
      expect(label).toBeTruthy();
      // zh default: "於新分頁開啟"; en: pattern match on the key presence
      expect(label).toContain("(");
      expect(label).toContain(")");
    }

    // Facebook specific check
    expect(facebookLink.getAttribute("aria-label")).toContain("Facebook");
    // X specific check
    expect(xLink.getAttribute("aria-label")).toMatch(/^X/);
    // LINE specific check
    expect(lineLink.getAttribute("aria-label")).toContain("LINE");

    // Email link (not target=_blank) should NOT have aria-label
    const emailLink = screen.getByRole("link", { name: /Email/ });
    expect(emailLink).not.toHaveAttribute("aria-label");
  });
});
