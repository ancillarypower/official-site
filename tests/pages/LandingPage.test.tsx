import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/context/I18nContext";
import LandingPage from "@/pages/LandingPage";

function renderPage() {
  return render(<MemoryRouter><I18nProvider><LandingPage /></I18nProvider></MemoryRouter>);
}

describe("LandingPage", () => {
  it("renders hero section with CTA links", () => {
    renderPage();
    expect(screen.getByText("打造智慧能源的未來")).toBeInTheDocument();
    expect(screen.getByText("了解更多").closest("a")).toHaveAttribute("href", "/about");
  });

  it("renders 3 metric cards", () => {
    renderPage();
    expect(screen.getByText("300+ MW")).toBeInTheDocument();
    expect(screen.getByText("100%+")).toBeInTheDocument();
    expect(screen.getByText("近 3 億度")).toBeInTheDocument();
  });

  it("renders explore navigation cards with correct links", () => {
    renderPage();
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/news");
    expect(hrefs).toContain("/models");
    expect(hrefs).toContain("/store");
    expect(hrefs).toContain("/about");
  });
});
