import { describe, it, expect, beforeEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/context/I18nContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { useSettingsStore } from "@/stores/settingsStore";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function withProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <I18nProvider>{ui}</I18nProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Sidebar", () => {
  beforeEach(() => {
    useSettingsStore.setState({ activePanel: null, wooKey: "", wooSecret: "" });
  });

  it("renders overlay and two aside panels", () => {
    const { container } = render(withProviders(<Sidebar />));
    const asides = container.querySelectorAll("aside");
    expect(asides).toHaveLength(2);
  });

  it("closes panel when overlay is clicked", () => {
    useSettingsStore.setState({ activePanel: "settings" });
    const { container } = render(withProviders(<Sidebar />));
    const overlay = container.querySelector(".fixed.inset-0");
    expect(overlay).toBeInTheDocument();
    fireEvent.click(overlay!);
    expect(useSettingsStore.getState().activePanel).toBeNull();
  });

  it("shows settings panel with aria-modal when active", () => {
    useSettingsStore.setState({ activePanel: "settings" });
    const { container } = render(withProviders(<Sidebar />));
    const settingsAside = container.querySelector(
      "aside[aria-label='設定']",
    );
    expect(settingsAside).toBeInTheDocument();
    expect(settingsAside).toHaveAttribute("aria-modal", "true");
    expect((settingsAside as HTMLElement).inert).toBe(false);
  });

  it("marks settings panel inert when not active", () => {
    useSettingsStore.setState({ activePanel: null });
    const { container } = render(withProviders(<Sidebar />));
    const settingsAside = container.querySelector(
      "aside[aria-label='設定']",
    );
    expect(settingsAside).toBeInTheDocument();
    expect((settingsAside as HTMLElement).inert).toBe(true);
    expect(settingsAside).not.toHaveAttribute("aria-modal");
  });

  it("shows cart panel with aria-modal when active", () => {
    useSettingsStore.setState({ activePanel: "cart" });
    const { container } = render(withProviders(<Sidebar />));
    const cartAside = container.querySelector(
      "aside[aria-label='購物車']",
    );
    expect(cartAside).toBeInTheDocument();
    expect(cartAside).toHaveAttribute("aria-modal", "true");
    expect((cartAside as HTMLElement).inert).toBe(false);
  });

  it("marks cart panel inert when settings is active", () => {
    useSettingsStore.setState({ activePanel: "settings" });
    const { container } = render(withProviders(<Sidebar />));
    const cartAside = container.querySelector(
      "aside[aria-label='購物車']",
    );
    expect(cartAside).toBeInTheDocument();
    expect((cartAside as HTMLElement).inert).toBe(true);
    expect(cartAside).not.toHaveAttribute("aria-modal");
  });

  it("overlay is visible when panel is active", () => {
    useSettingsStore.setState({ activePanel: "cart" });
    const { container } = render(withProviders(<Sidebar />));
    const overlay = container.querySelector(".fixed.inset-0");
    expect(overlay).toBeInTheDocument();
  });
});

describe("Sidebar focus trap", () => {
  beforeEach(() => {
    useSettingsStore.setState({ activePanel: null, wooKey: "", wooSecret: "" });
  });

  it("moves focus into settings panel when opened", () => {
    useSettingsStore.setState({ activePanel: "settings" });
    const { container } = render(withProviders(<Sidebar />));
    const settingsAside = container.querySelector(
      "aside[aria-label='設定']",
    )!;
    expect(settingsAside.contains(document.activeElement)).toBe(true);
  });

  it("closes panel on Escape key", () => {
    useSettingsStore.setState({ activePanel: "settings" });
    render(withProviders(<Sidebar />));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(useSettingsStore.getState().activePanel).toBeNull();
  });

  it("wraps focus from last to first element on Tab", () => {
    useSettingsStore.setState({ activePanel: "settings" });
    const { container } = render(withProviders(<Sidebar />));
    const settingsAside = container.querySelector(
      "aside[aria-label='設定']",
    )!;
    const focusable =
      settingsAside.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    expect(focusable.length).toBeGreaterThan(0);
    const last = focusable[focusable.length - 1];
    last.focus();
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(focusable[0]);
  });

  it("wraps focus from first to last element on Shift+Tab", () => {
    useSettingsStore.setState({ activePanel: "settings" });
    const { container } = render(withProviders(<Sidebar />));
    const settingsAside = container.querySelector(
      "aside[aria-label='設定']",
    )!;
    const focusable =
      settingsAside.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    expect(focusable.length).toBeGreaterThan(0);
    const first = focusable[0];
    first.focus();
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(focusable[focusable.length - 1]);
  });

  it("restores focus to previously focused element on close", () => {
    const { container } = render(
      withProviders(
        <>
          <button data-testid="trigger">Trigger</button>
          <Sidebar />
        </>,
      ),
    );
    const trigger = container.querySelector(
      "[data-testid='trigger']",
    ) as HTMLElement;
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    act(() => {
      useSettingsStore.setState({ activePanel: "settings" });
    });

    const settingsAside = container.querySelector(
      "aside[aria-label='設定']",
    )!;
    expect(settingsAside.contains(document.activeElement)).toBe(true);

    act(() => {
      useSettingsStore.setState({ activePanel: null });
    });

    expect(document.activeElement).toBe(trigger);
  });
});
