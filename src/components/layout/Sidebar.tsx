import { useState, useRef, useEffect } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import { SettingsPanel } from "@/components/layout/SettingsPanel";
import { CartPanel } from "@/components/store/CartPanel";
import { useI18n } from "@/context/I18nContext";

type PanelType = "settings" | "cart";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/** Duration (ms) matching the CSS `duration-350` transition class. */
const TRANSITION_MS = 350;

export function Sidebar() {
  const activePanel = useSettingsStore((s) => s.activePanel);
  const closePanel = useSettingsStore((s) => s.closePanel);
  const { t } = useI18n();
  const panelRef = useRef<HTMLElement>(null);

  // Track which panel is mounted in the DOM.
  // On open: mount immediately so the slide-in animation plays.
  // On close: keep mounted for TRANSITION_MS so the slide-out animation
  // completes, then unmount to free resources (Issue #117).
  const [mounted, setMounted] = useState<PanelType | null>(activePanel);

  useEffect(() => {
    if (activePanel) {
      setMounted(activePanel);
    } else {
      const timer = setTimeout(() => setMounted(null), TRANSITION_MS);
      return () => clearTimeout(timer);
    }
  }, [activePanel]);

  // Manage inert imperatively — React 18 JSX lacks inert prop support.
  // While the panel is mounted but closing (activePanel is null, mounted
  // is still set), inert prevents interaction during the slide-out animation.
  useEffect(() => {
    const el = panelRef.current;
    if (el) el.inert = !activePanel;
    return () => {
      if (el) el.inert = false;
    };
  }, [activePanel, mounted]);

  // Focus trap: move focus in, wrap Tab/Shift+Tab, Escape closes, restore.
  // Uses document listener (not React synthetic) per WAI-ARIA dialog pattern.
  // Focusable elements are re-queried on every keydown to handle dynamic content.
  useEffect(() => {
    if (!activePanel) return;

    const panelEl = panelRef.current;
    if (!panelEl) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const firstFocusable =
      panelEl.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    if (firstFocusable) firstFocusable.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closePanel();
        return;
      }

      if (e.key !== "Tab") return;

      const focusable = Array.from(
        panelEl!.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [activePanel, closePanel]);

  return (
    <>
      <div
        className={`fixed inset-0 z-[200] bg-black/30 transition-opacity duration-250 ${
          activePanel
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={closePanel}
        aria-hidden="true"
      />

      {mounted === "settings" && (
        <aside
          ref={panelRef}
          className={`fixed top-0 right-0 bottom-0 z-[201] flex w-[380px] max-w-[92vw] flex-col overflow-y-auto border-l border-border-default bg-surface-raised transition-transform duration-350 ${
            activePanel === "settings" ? "translate-x-0" : "translate-x-full"
          }`}
          role="dialog"
          aria-label={t("a11y_settings_panel")}
          aria-modal={activePanel === "settings" ? "true" : undefined}
        >
          <SettingsPanel />
        </aside>
      )}

      {mounted === "cart" && (
        <aside
          ref={panelRef}
          className={`fixed top-0 right-0 bottom-0 z-[201] flex w-[380px] max-w-[92vw] flex-col overflow-y-auto border-l border-border-default bg-surface-raised transition-transform duration-350 ${
            activePanel === "cart" ? "translate-x-0" : "translate-x-full"
          }`}
          role="dialog"
          aria-label={t("a11y_cart_panel")}
          aria-modal={activePanel === "cart" ? "true" : undefined}
        >
          <CartPanel />
        </aside>
      )}
    </>
  );
}
