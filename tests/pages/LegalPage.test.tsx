import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/context/I18nContext";
import LegalPage from "@/pages/LegalPage";

describe("LegalPage", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <MemoryRouter>
        <I18nProvider>
          <LegalPage />
        </I18nProvider>
      </MemoryRouter>,
    );
    const text = container.textContent ?? "";
    expect(text).toContain("WooCommerce");
    expect(text).toContain("IndexedDB");
  });
});
