import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { ensureHttps } from "@/lib/api";

export type Theme = "light" | "sepia" | "dark";

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

  /** Reading mode theme */
  theme: Theme;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;

  /** Active sidebar panel */
  activePanel: "settings" | "cart" | null;
  openPanel: (panel: "settings" | "cart") => void;
  closePanel: () => void;

  /** Effective WooCommerce base URL */
  getWooBaseUrl: () => string;
}

const THEME_ORDER: Theme[] = ["light", "sepia", "dark"];

function applyTheme(theme: Theme) {
  if (theme === "light") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

/** Current schema version for the persisted settings state. */
export const SETTINGS_VERSION = 1;

/**
 * Zod schema for runtime validation of persisted settings.
 *
 * Every field mirrors the constraints enforced by the UI and the
 * SettingsState interface.  All fields are optional so that a partial
 * parse keeps missing keys as undefined (currentState defaults apply).
 *
 * If validation fails the entire blob is discarded and defaults are
 * used, preventing corrupted localStorage from injecting invalid
 * values into the active state.  See GitHub issue #448.
 */
export const persistedSettingsSchema = z.object({
  contentType: z
    .enum(["posts", "pages", "categories", "tags", "media"])
    .optional(),
  perPage: z.number().int().min(1).max(100).optional(),
  wooPerPage: z.number().int().min(1).max(100).optional(),
  fontScale: z.number().min(0.7).max(1.5).optional(),
  theme: z.enum(["light", "sepia", "dark"]).optional(),
  wpUrl: z.string().optional(),
  wooUrl: z.string().optional(),
  wooUseSameUrl: z.boolean().optional(),
  useProxy: z.boolean().optional(),
});

/**
 * Migrate persisted settings data from older versions.
 *
 * Version 0 (implicit): No persisted settings existed before this change.
 * Version 1: Initial persist schema. Preserves any existing data as-is.
 */
export function migrateSettings(
  persisted: unknown,
  version: number,
): Partial<SettingsState> | Record<string, unknown> {
  if (version === 0) {
    return persisted as Record<string, unknown>;
  }
  return persisted as Partial<SettingsState>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      wpUrl: import.meta.env.VITE_WP_URL || "https://www.ancillarypower.com",
      setWpUrl: (url) => set({ wpUrl: url }),

      // Security: credentials must ONLY be entered via the UI Settings panel.
      // Never use VITE_* env vars for secrets — Vite embeds them in the
      // client bundle at build time.  See GitHub issue #247.
      wooKey: "",
      wooSecret: "",
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
        window.dispatchEvent(new CustomEvent("fontscalechange"));
      },

      theme: "light",
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      cycleTheme: () => {
        const current = get().theme;
        const idx = THEME_ORDER.indexOf(current);
        const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length]!;
        applyTheme(next);
        set({ theme: next });
      },

      activePanel: null,
      openPanel: (panel) => set({ activePanel: panel }),
      closePanel: () => set({ activePanel: null }),

      getWooBaseUrl: () => {
        const state = get();
        const raw = state.wooUseSameUrl ? state.wpUrl : state.wooUrl;
        return ensureHttps(raw);
      },
    }),
    {
      name: "ap-settings",
      version: SETTINGS_VERSION,
      migrate: migrateSettings,
      partialize: (state) => ({
        fontScale: state.fontScale,
        theme: state.theme,
        wpUrl: state.wpUrl,
        wooUrl: state.wooUrl,
        wooUseSameUrl: state.wooUseSameUrl,
        contentType: state.contentType,
        perPage: state.perPage,
        wooPerPage: state.wooPerPage,
        useProxy: state.useProxy,
      }),
      merge: (persistedState, currentState) => {
        const parsed = persistedSettingsSchema.safeParse(persistedState);
        return {
          ...currentState,
          ...(parsed.success ? parsed.data : {}),
          // Defense-in-depth: never restore credentials from storage,
          // even if localStorage was tampered with.  See #247.
          wooKey: "",
          wooSecret: "",
        };
      },
      onRehydrateStorage: () => {
        return (state, error) => {
          if (state && !error) {
            applyTheme(state.theme);
            document.documentElement.style.setProperty(
              "--font-scale",
              String(state.fontScale),
            );
          }
        };
      },
    },
  ),
);
