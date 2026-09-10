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

  it("renders the mission with Taipower first-mover and 100% local team", () => {
    render(withProviders(<AboutPage />));
    expect(screen.getByText("我們的使命")).toBeInTheDocument();
    expect(
      screen.getByText(/100% 台灣本土團隊/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/台電電力交易平台首批/),
    ).toBeInTheDocument();
  });

  it("renders the highlights section with earthquake rescue and awards", () => {
    render(withProviders(<AboutPage />));
    expect(screen.getByText("重要成就")).toBeInTheDocument();
    expect(screen.getByText(/300\+ MW/)).toBeInTheDocument();
    expect(screen.getByText(/花蓮大地震/)).toBeInTheDocument();
    expect(screen.getByText(/NVIDIA Inception/)).toBeInTheDocument();
    expect(screen.getByText(/創業綻放/)).toBeInTheDocument();
    expect(screen.getByText(/龍騰微笑獎/)).toBeInTheDocument();
  });

  it("renders all three service cards", () => {
    render(withProviders(<AboutPage />));
    expect(screen.getByText("VPP 虛擬電廠")).toBeInTheDocument();
    expect(screen.getByText(/台電電力交易機制/)).toBeInTheDocument();
    expect(screen.getByText("綠電交易與採購")).toBeInTheDocument();
    expect(screen.getByText("儲能與能源管理")).toBeInTheDocument();
  });

  it("renders the contact section with email and website", () => {
    render(withProviders(<AboutPage />));
    expect(screen.getByText("聯絡我們")).toBeInTheDocument();
    const emailLink = screen.getByText(
      "contact@ancillarypower.com",
    );
    expect(emailLink).toHaveAttribute(
      "href",
      "mailto:contact@ancillarypower.com",
    );
    const websiteLink = screen.getByText("ancillarypower.com");
    expect(websiteLink).toHaveAttribute(
      "href",
      "https://www.ancillarypower.com",
    );
  });

  it("renders dual phone and address", () => {
    render(withProviders(<AboutPage />));
    expect(
      screen.getByText(/02-2727-2988/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/02-7755-5030/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/台北市中正區新生南路一段/),
    ).toBeInTheDocument();
  });
});
