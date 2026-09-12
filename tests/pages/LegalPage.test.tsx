import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/context/I18nContext";
import LegalPage from "@/pages/LegalPage";

function withProviders(ui: React.ReactElement) {
  return (
    <MemoryRouter>
      <I18nProvider>{ui}</I18nProvider>
    </MemoryRouter>
  );
}

describe("LegalPage", () => {
  it("renders the Privacy Policy title", () => {
    render(withProviders(<LegalPage />));
    expect(screen.getByText("\u96b1\u79c1\u6b0a\u653f\u7b56")).toBeInTheDocument();
  });

  it("renders the Terms of Service title", () => {
    render(withProviders(<LegalPage />));
    expect(screen.getByText("\u670d\u52d9\u689d\u6b3e")).toBeInTheDocument();
  });

  it("renders all nine Privacy Policy sections", () => {
    render(withProviders(<LegalPage />));
    expect(screen.getByText("\u6982\u8ff0", { selector: "h3" })).toBeTruthy();
    expect(screen.getByText(/\u6211\u5011\u8490\u96c6\u54ea\u4e9b\u8cc7\u6599/)).toBeInTheDocument();
    expect(screen.getByText(/\u8490\u96c6\u76ee\u7684\u8207\u5229\u7528\u65b9\u5f0f/)).toBeInTheDocument();
    expect(screen.getByText(/\u672c\u6a5f\u8cc7\u6599\u5132\u5b58/)).toBeInTheDocument();
    expect(screen.getByText(/\u7b2c\u4e09\u65b9\u670d\u52d9/)).toBeInTheDocument();
    expect(screen.getByText(/\u8cc7\u6599\u5b89\u5168\u63aa\u65bd/)).toBeInTheDocument();
    expect(screen.getByText(/\u60a8\u7684\u6b0a\u5229/)).toBeInTheDocument();
    expect(screen.getByText(/\u8cc7\u6599\u4fdd\u5b58\u671f\u9593/)).toBeInTheDocument();
    expect(screen.getByText(/\u653f\u7b56\u8b8a\u66f4/)).toBeInTheDocument();
  });

  it("renders all seven Terms of Service sections", () => {
    render(withProviders(<LegalPage />));
    expect(screen.getByText(/\u4f7f\u7528\u898f\u7bc4/)).toBeInTheDocument();
    expect(screen.getByText(/\u667a\u6167\u8ca1\u7522\u6b0a/)).toBeInTheDocument();
    expect(screen.getByText(/\u5546\u5e97\u8207\u4ea4\u6613/)).toBeInTheDocument();
    expect(screen.getByText(/\u514d\u8cac\u8072\u660e/)).toBeInTheDocument();
    expect(screen.getByText(/\u8cac\u4efb\u9650\u5236/)).toBeInTheDocument();
    expect(screen.getByText(/\u689d\u6b3e\u8b8a\u66f4/)).toBeInTheDocument();
    expect(screen.getByText(/\u6e96\u64da\u6cd5\u8207\u7ba1\u8f44/)).toBeInTheDocument();
  });

  it("references the Taiwan PDPA in privacy policy content", () => {
    render(withProviders(<LegalPage />));
    expect(screen.getByText(/\u500b\u4eba\u8cc7\u6599\u4fdd\u8b77\u6cd5/)).toBeInTheDocument();
  });

  it("mentions specific data types collected", () => {
    render(withProviders(<LegalPage />));
    expect(screen.getByText(/WooCommerce/)).toBeTruthy();
    expect(screen.getByText(/IndexedDB/)).toBeTruthy();
    expect(screen.getByText(/localStorage/)).toBeTruthy();
  });

  it("lists third-party services", () => {
    render(withProviders(<LegalPage />));
    expect(screen.getByText(/corsproxy\.io/)).toBeInTheDocument();
    expect(screen.getByText(/allorigins\.win/)).toBeInTheDocument();
    expect(screen.getByText(/jsDelivr CDN/)).toBeInTheDocument();
  });

  it("includes contact information", () => {
    render(withProviders(<LegalPage />));
    expect(screen.getByText(/contact@ancillarypower\.com/)).toBeInTheDocument();
    expect(screen.getByText(/02-2727-2988/)).toBeInTheDocument();
  });

  it("specifies Taipei District Court as jurisdiction", () => {
    render(withProviders(<LegalPage />));
    expect(screen.getByText(/\u53f0\u5317\u5730\u65b9\u6cd5\u9662/)).toBeInTheDocument();
  });
});
