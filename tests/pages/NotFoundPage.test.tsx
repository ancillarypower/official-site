import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock useI18n
const mockT = vi.fn((key: string) => {
  const map: Record<string, string> = {
    not_found_title: "找不到頁面",
    not_found_text: "您要找的頁面不存在或已被移動。",
    not_found_home: "回到首頁",
    nav_brand_name: "安瑟樂威",
  };
  return map[key] ?? key;
});

vi.mock("@/context/I18nContext", () => ({
  useI18n: () => ({ t: mockT, lang: "zh" }),
}));

// Mock useDocumentTitle
vi.mock("@/hooks/useDocumentTitle", () => ({
  useDocumentTitle: vi.fn(),
}));

import NotFoundPage from "@/pages/NotFoundPage";

describe("NotFoundPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 404 heading", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("renders home link pointing to /", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: "回到首頁" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });

  it("displays friendly i18n message", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("找不到頁面")).toBeInTheDocument();
    expect(
      screen.getByText("您要找的頁面不存在或已被移動。"),
    ).toBeInTheDocument();
  });
});
