import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/context/I18nContext";
import LegalPage from "@/pages/LegalPage";

function renderLegal() {
  return render(
    <MemoryRouter>
      <I18nProvider>
        <LegalPage />
      </I18nProvider>
    </MemoryRouter>,
  );
}

describe("LegalPage", () => {
  it("renders both Privacy Policy and Terms of Service titles", () => {
    const { container } = renderLegal();
    const text = container.textContent ?? "";
    expect(text).toContain("\u96b1\u79c1\u6b0a\u653f\u7b56");
    expect(text).toContain("\u670d\u52d9\u689d\u6b3e");
  });

  it("renders all Privacy Policy section headings", () => {
    const { container } = renderLegal();
    const text = container.textContent ?? "";
    expect(text).toContain("\u4e00\u3001\u6211\u5011\u8490\u96c6\u54ea\u4e9b\u8cc7\u6599");
    expect(text).toContain("\u4e8c\u3001\u8490\u96c6\u76ee\u7684\u8207\u5229\u7528\u65b9\u5f0f");
    expect(text).toContain("\u4e09\u3001\u672c\u6a5f\u8cc7\u6599\u5132\u5b58");
    expect(text).toContain("\u56db\u3001\u7b2c\u4e09\u65b9\u670d\u52d9");
    expect(text).toContain("\u4e94\u3001\u8cc7\u6599\u5b89\u5168\u63aa\u65bd");
    expect(text).toContain("\u516d\u3001\u60a8\u7684\u6b0a\u5229");
    expect(text).toContain("\u4e03\u3001\u8cc7\u6599\u4fdd\u5b58\u671f\u9593");
    expect(text).toContain("\u516b\u3001\u653f\u7b56\u8b8a\u66f4");
    expect(text).toContain("\u4e5d\u3001\u806f\u7d61\u65b9\u5f0f");
  });

  it("renders all Terms of Service section headings", () => {
    const { container } = renderLegal();
    const text = container.textContent ?? "";
    expect(text).toContain("\u4e00\u3001\u4f7f\u7528\u898f\u7bc4");
    expect(text).toContain("\u4e8c\u3001\u667a\u6167\u8ca1\u7522\u6b0a");
    expect(text).toContain("\u4e09\u3001\u5546\u5e97\u8207\u4ea4\u6613");
    expect(text).toContain("\u56db\u3001\u514d\u8cac\u8072\u660e");
    expect(text).toContain("\u4e94\u3001\u8cac\u4efb\u9650\u5236");
    expect(text).toContain("\u516d\u3001\u689d\u6b3e\u8b8a\u66f4");
    expect(text).toContain("\u4e03\u3001\u6e96\u64da\u6cd5\u8207\u7ba1\u8f44");
  });

  it("references the Taiwan PDPA", () => {
    const { container } = renderLegal();
    expect(container.textContent).toContain("\u500b\u4eba\u8cc7\u6599\u4fdd\u8b77\u6cd5");
  });

  it("mentions data storage technologies", () => {
    const { container } = renderLegal();
    const text = container.textContent ?? "";
    expect(text).toContain("WooCommerce");
    expect(text).toContain("IndexedDB");
    expect(text).toContain("localStorage");
  });

  it("lists third-party services", () => {
    const { container } = renderLegal();
    const text = container.textContent ?? "";
    expect(text).toContain("corsproxy.io");
    expect(text).toContain("allorigins.win");
    expect(text).toContain("jsDelivr CDN");
  });

  it("includes contact information", () => {
    const { container } = renderLegal();
    const text = container.textContent ?? "";
    expect(text).toContain("contact@ancillarypower.com");
    expect(text).toContain("02-2727-2988");
  });

  it("specifies Taipei District Court as jurisdiction", () => {
    const { container } = renderLegal();
    expect(container.textContent).toContain("\u53f0\u5317\u5730\u65b9\u6cd5\u9662");
  });

  it("discloses non-provision impact per PDPA Article 8", () => {
    const { container } = renderLegal();
    expect(container.textContent).toContain("\u7121\u6cd5\u5b8c\u6210\u8a02\u55ae");
  });

  it("mentions data usage territory", () => {
    const { container } = renderLegal();
    expect(container.textContent).toContain("\u4e2d\u83ef\u6c11\u570b\u5883\u5167");
  });
});
