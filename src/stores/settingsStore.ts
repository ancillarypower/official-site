import { create } from "zustand";

interface SettingsState {
  /** WordPress site URL */
  wpUrl: string;
  setWpUrl: (url: string) => void;

  /** WooCommerce credentials */
  wooKey: string;
  wooSecret: string;
  wooUrl: string;
  wooUseSameUrl: boolean;
  setWooKey: (key: string) => void;
  setWooSecret: (secret: string) => void;
  setWooUrl: (url: string) => void;
  setWooUseSameUrl: (use: boolean) => void;

  /** Use CORS proxy for API requests */
  useProxy: boolean;
  setUseProxy: (use: boolean) => void;

  /** Content fetch settings */
  contentType: "posts" | "pages" | "categories" | "tags" | "media";
  perPage: number;
  wooPerPage: number;
  setContentType: (type: SettingsState["contentType"]) => void;
  setPerPage: (n: number) => void;
  setWooPerPage: (n: number) => void;

  /** Font scale (0.7 - 1.5) */
  fontScale: number;
  setFontScale: (scale: number) => void;

  /** Active sidebar panel */
  activePanel: "settings" | "cart" | null;
  openPanel: (panel: "settings" | "cart") => void;
  closePanel: () => void;

  /** Effective WooCommerce base URL */
  getWooBaseUrl: () => string;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  wpUrl: import.meta.env.VITE_WP_URL || "https://www.ancillarypower.com",
  setWpUrl: (url) => set({ wpUrl: url }),

  wooKey: import.meta.env.VITE_WOO_KEY || "",
  wooSecret: import.meta.env.VITE_WOO_SECRET || "",
  wooUrl: "",
  wooUseSameUrl: true,
  setWooKey: (key) => set({ wooKey: key }),
  setWooSecret: (secret) => set({ wooSecret: secret }),
  setWooUrl: (url) => set({ wooUrl: url }),
  setWooUseSameUrl: (use) => set({ wooUseSameUrl: use }),

  useProxy: false,
  setUseProxy: (use) => set({ useProxy: use }),

  contentType: "posts",
  perPage: 20,
  wooPerPage: 20,
  setContentType: (type) => set({ contentType: type }),
  setPerPage: (n) => set({ perPage: n }),
  setWooPerPage: (n) => set({ wooPerPage: n }),

  fontScale: 1,
  setFontScale: (scale) => {
    const clamped = Math.max(0.7, Math.min(1.5, scale));
    document.documentElement.style.setProperty("--font-scale", String(clamped));
    set({ fontScale: clamped });
  },

  activePanel: null,
  openPanel: (panel) => set({ activePanel: panel }),
  closePanel: () => set({ activePanel: null }),

  getWooBaseUrl: () => {
    const state = get();
    let url = state.wooUseSameUrl ? state.wpUrl : state.wooUrl;
    url = url.trim().replace(/\/+$/, "");
    if (url && !url.startsWith("http")) url = "https://" + url;
    return url;
  },
}));
