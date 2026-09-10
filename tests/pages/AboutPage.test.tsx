import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/context/I18nContext";
import AboutPage from "@/pages/AboutPage";

function withProviders(ui: React.ReactElement) {
  return (
    <MemoryRouter>
      <I18nProvider>{ui}</I18nProvider>
    </MemoryRouter>
  );
}

describe("AboutPage", () => {
  it("renders the page title", () => {
    render(withProviders(<AboutPage />));
    expect(
      screen.getByText("關於 Ancillary Power"),
    ).toBeInTheDocument();
  });

  it("renders the mission section", () => {
    render(withProviders(<AboutPage />));
    expect(screen.getByText("我們的使命")).toBeInTheDocument();
  });

  it("renders all three service cards", () => {
    render(withProviders(<AboutPage />));
    expect(screen.getByText("內容管理")).toBeInTheDocument();
    expect(screen.getByText("3D 模型展示")).toBeInTheDocument();
    expect(screen.getByText("電子商務")).toBeInTheDocument();
  });

  it("renders the contact section with email link", () => {
    render(withProviders(<AboutPage />));
    expect(screen.getByText("聯絡我們")).toBeInTheDocument();
    const emailLink = screen.getByText(
      "contact@ancillarypower.com",
    );
    expect(emailLink).toBeInTheDocument();
    expect(emailLink).toHaveAttribute(
      "href",
      "mailto:contact@ancillarypower.com",
    );
  });
});
