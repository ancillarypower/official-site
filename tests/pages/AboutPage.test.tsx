import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/context/I18nContext";
import { en } from "@/i18n/en";
import { zh } from "@/i18n/zh";
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

  it("phone numbers are tel: links (regression #113)", () => {
    render(withProviders(<AboutPage />));
    const phone1 = screen.getByText("02-2727-2988");
    expect(phone1.tagName).toBe("A");
    expect(phone1).toHaveAttribute("href", "tel:0227272988");
    const phone2 = screen.getByText("02-7755-5030");
    expect(phone2.tagName).toBe("A");
    expect(phone2).toHaveAttribute("href", "tel:0277555030");
  });

  it("renders OpenStreetMap iframe and Google Maps navigation link (regression #158)", () => {
    localStorage.setItem("ap-lang", "zh");
    const { unmount } = render(withProviders(<AboutPage />));
    const mapIframe = screen.getByTitle(zh.about_map_title);
    expect(mapIframe.tagName).toBe("IFRAME");
    expect(mapIframe).toHaveAttribute(
      "src",
      "https://www.openstreetmap.org/export/embed.html?bbox=121.5275%2C25.0397%2C121.5375%2C25.0447&layer=mapnik&marker=25.0422%2C121.5325",
    );
    expect(mapIframe).toHaveAttribute("loading", "lazy");
    expect(mapIframe).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(mapIframe).toHaveAttribute(
      "sandbox",
      "allow-scripts allow-same-origin",
    );

    const mapsLink = screen.getByRole("link", {
      name: zh.about_map_link,
    });
    expect(mapsLink).toHaveAttribute(
      "href",
      "https://www.google.com/maps/dir/?api=1&destination=25.0422,121.5325",
    );
    expect(mapsLink).toHaveAttribute("target", "_blank");

    unmount();
    localStorage.setItem("ap-lang", "en");
    render(withProviders(<AboutPage />));
    expect(screen.getByTitle(en.about_map_title)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: en.about_map_link }),
    ).toBeInTheDocument();
    localStorage.removeItem("ap-lang");
  });
});
