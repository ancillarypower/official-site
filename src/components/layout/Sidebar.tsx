import { useSettingsStore } from "@/stores/settingsStore";
import { SettingsPanel } from "@/components/layout/SettingsPanel";
import { CartPanel } from "@/components/store/CartPanel";

export function Sidebar() {
  const { activePanel, closePanel } = useSettingsStore();

  return (
    <>
      <div
        className={`fixed inset-0 z-[200] bg-black/30 transition-opacity duration-250 ${
          activePanel ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closePanel}
        aria-hidden="true"
      />

      <aside
        className={`fixed top-0 right-0 bottom-0 z-[201] flex w-[380px] max-w-[92vw] flex-col overflow-y-auto border-l border-border-default bg-surface-raised transition-transform duration-350 ${
          activePanel === "settings" ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Settings"
        aria-hidden={activePanel !== "settings"}
      >
        <SettingsPanel />
      </aside>

      <aside
        className={`fixed top-0 right-0 bottom-0 z-[201] flex w-[380px] max-w-[92vw] flex-col overflow-y-auto border-l border-border-default bg-surface-raised transition-transform duration-350 ${
          activePanel === "cart" ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Shopping cart"
        aria-hidden={activePanel !== "cart"}
      >
        <CartPanel />
      </aside>
    </>
  );
}
