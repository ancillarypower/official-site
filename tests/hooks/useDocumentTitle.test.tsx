import { describe, it, expect, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { ReactNode } from "react";

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider>{children}</I18nProvider>
);

describe("useDocumentTitle", () => {
  afterEach(() => {
    document.title = "";
  });

  it("sets document.title with page title and brand", () => {
    renderHook(() => useDocumentTitle("消息"), { wrapper });
    // Default lang is "zh", so brand = "安瑟樂威"
    expect(document.title).toBe("消息 | 安瑟樂威");
  });

  it("sets brand-only title when page title is empty", () => {
    renderHook(() => useDocumentTitle(""), { wrapper });
    expect(document.title).toBe("安瑟樂威");
  });

  it("restores previous title on unmount", () => {
    document.title = "Original Title";
    const { unmount } = renderHook(() => useDocumentTitle("消息"), { wrapper });
    expect(document.title).toBe("消息 | 安瑟樂威");
    unmount();
    expect(document.title).toBe("Original Title");
  });
});
