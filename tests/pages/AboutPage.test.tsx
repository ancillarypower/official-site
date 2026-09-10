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
      screen.getByText("關於安瑟樂威"),
    ).toBeInTheDocument();
  });

  it("renders the mission section", () => {
    render(withProviders(<AboutPage />));
    expect(screen.getByText("我們的使命")).toBeInTheDocument();
  });

  it("renders all three service cards", () => {
    render(withProviders(<AboutPage />));
    expect(screen.getByText("VPP 虛擬電廠")).toBeInTheDocument();
    expect(screen.getByText("綠電交易與採購")).toBeInTheDocument();
    expect(screen.getByText("儲能與能源管理")).toBeInTheDocument();
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

  it("renders phone and address contact info", () => {
    render(withProviders(<AboutPage />));
    const phoneLink = screen.getByText("02-2727-2988");
    expect(phoneLink).toBeInTheDocument();
    expect(phoneLink).toHaveAttribute(
      "href",
      "tel:02-2727-2988",
    );
    expect(
      screen.getByText(
        /台北市中正區新生南路一段/,
      ),
    ).toBeInTheDocument();
  });
});
