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
      screen.getByText("\u95dc\u65bc\u5b89\u7463\u6a02\u5a01"),
    ).toBeInTheDocument();
  });

  it("renders the mission with Taipower first-mover and 100% local team", () => {
    render(withProviders(<AboutPage />));
    expect(screen.getByText("\u6211\u5011\u7684\u4f7f\u547d")).toBeInTheDocument();
    expect(
      screen.getByText(/100% \u53f0\u7063\u672c\u571f\u5718\u968a/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/\u53f0\u96fb\u96fb\u529b\u4ea4\u6613\u5e73\u53f0\u9996\u6279/),
    ).toBeInTheDocument();
  });

  it("renders the highlights section with earthquake rescue and awards", () => {
    render(withProviders(<AboutPage />));
    expect(screen.getByText("\u91cd\u8981\u6210\u5c31")).toBeInTheDocument();
    expect(screen.getByText(/300\+ MW/)).toBeInTheDocument();
    expect(screen.getByText(/\u82b1\u84ee\u5927\u5730\u9707/)).toBeInTheDocument();
    expect(screen.getByText(/NVIDIA Inception/)).toBeInTheDocument();
    expect(screen.getByText(/\u5275\u696d\u7dbb\u653e/)).toBeInTheDocument();
    expect(screen.getByText(/\u9f8d\u9a30\u5fae\u7b11\u734e/)).toBeInTheDocument();
  });

  it("renders all three service cards", () => {
    render(withProviders(<AboutPage />));
    expect(screen.getByText("VPP \u865b\u64ec\u96fb\u5ee0")).toBeInTheDocument();
    expect(screen.getByText(/\u53f0\u96fb\u96fb\u529b\u4ea4\u6613\u6a5f\u5236/)).toBeInTheDocument();
    expect(screen.getByText("\u7da0\u96fb\u4ea4\u6613\u8207\u63a1\u8cfc")).toBeInTheDocument();
    expect(screen.getByText("\u5132\u80fd\u8207\u80fd\u6e90\u7ba1\u7406")).toBeInTheDocument();
  });

  it("renders the contact section with email and website", () => {
    render(withProviders(<AboutPage />));
    expect(screen.getByText("\u806f\u7d61\u6211\u5011")).toBeInTheDocument();
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
      screen.getByText(/\u53f0\u5317\u5e02\u4e2d\u6b63\u5340\u65b0\u751f\u5357\u8def\u4e00\u6bb5/),
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
});
