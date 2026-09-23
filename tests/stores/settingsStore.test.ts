import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSettingsStore } from "@/stores/settingsStore";

describe("settingsStore", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.removeProperty("--font-scale");
    document.documentElement.removeAttribute("data-theme");
    useSettingsStore.setState({ wpUrl: "https://www.ancillarypower.com", wooKey: "", wooSecret: "", wooUrl: "", wooUseSameUrl: true, useProxy: false, contentType: "posts", perPage: 20, wooPerPage: 20, fontScale: 1, theme: "light", activePanel: null });
  });

  it("has correct default values", () => {
    const s = useSettingsStore.getState();
    expect(s.contentType).toBe("posts");
    expect(s.perPage).toBe(20);
    expect(s.useProxy).toBe(false);
    expect(s.fontScale).toBe(1);
    expect(s.theme).toBe("light");
    expect(s.activePanel).toBeNull();
  });

  it("sets WP URL", () => {
    useSettingsStore.getState().setWpUrl("https://new-site.com");
    expect(useSettingsStore.getState().wpUrl).toBe("https://new-site.com");
  });

  it("sets content type", () => {
    useSettingsStore.getState().setContentType("pages");
    expect(useSettingsStore.getState().contentType).toBe("pages");
  });

  it("sets per page", () => {
    useSettingsStore.getState().setPerPage(50);
    expect(useSettingsStore.getState().perPage).toBe(50);
  });

  it("sets proxy toggle", () => {
    useSettingsStore.getState().setUseProxy(true);
    expect(useSettingsStore.getState().useProxy).toBe(true);
  });

  it("clamps font scale to [0.7, 1.5]", () => {
    useSettingsStore.getState().setFontScale(0.3);
    expect(useSettingsStore.getState().fontScale).toBe(0.7);
    useSettingsStore.getState().setFontScale(2.0);
    expect(useSettingsStore.getState().fontScale).toBe(1.5);
    useSettingsStore.getState().setFontScale(1.2);
    expect(useSettingsStore.getState().fontScale).toBe(1.2);
  });

  it("sets --font-scale CSS custom property on documentElement", () => {
    useSettingsStore.getState().setFontScale(1.2);
    expect(
      document.documentElement.style.getPropertyValue("--font-scale")
    ).toBe("1.2");
  });

  it("dispatches fontscalechange event on setFontScale (#110)", () => {
    const spy = vi.fn();
    window.addEventListener("fontscalechange", spy);
    try {
      useSettingsStore.getState().setFontScale(1.2);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0]![0]).toBeInstanceOf(CustomEvent);
    } finally {
      window.removeEventListener("fontscalechange", spy);
    }
  });

  it("opens and closes panels", () => {
    useSettingsStore.getState().openPanel("settings");
    expect(useSettingsStore.getState().activePanel).toBe("settings");
    useSettingsStore.getState().openPanel("cart");
    expect(useSettingsStore.getState().activePanel).toBe("cart");
    useSettingsStore.getState().closePanel();
    expect(useSettingsStore.getState().activePanel).toBeNull();
  });

  it("sets WooCommerce credentials", () => {
    useSettingsStore.getState().setWooKey("ck_test");
    useSettingsStore.getState().setWooSecret("cs_test");
    expect(useSettingsStore.getState().wooKey).toBe("ck_test");
    expect(useSettingsStore.getState().wooSecret).toBe("cs_test");
  });

  it("getWooBaseUrl uses wpUrl when wooUseSameUrl is true", () => {
    useSettingsStore.getState().setWpUrl("https://shop.com");
    useSettingsStore.getState().setWooUseSameUrl(true);
    expect(useSettingsStore.getState().getWooBaseUrl()).toBe("https://shop.com");
  });

  it("getWooBaseUrl uses wooUrl when wooUseSameUrl is false", () => {
    useSettingsStore.getState().setWooUseSameUrl(false);
    useSettingsStore.getState().setWooUrl("https://woo.shop.com");
    expect(useSettingsStore.getState().getWooBaseUrl()).toBe("https://woo.shop.com");
  });

  it("getWooBaseUrl adds https if missing", () => {
    useSettingsStore.getState().setWpUrl("mysite.com");
    expect(useSettingsStore.getState().getWooBaseUrl()).toBe("https://mysite.com");
  });

  it("getWooBaseUrl upgrades http:// to https:// (regression #111)", () => {
    useSettingsStore.getState().setWpUrl("http://mysite.com");
    expect(useSettingsStore.getState().getWooBaseUrl()).toBe("https://mysite.com");
  });

  it("setTheme to dark applies data-theme attribute", () => {
    useSettingsStore.getState().setTheme("dark");
    expect(useSettingsStore.getState().theme).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("setTheme to sepia applies data-theme attribute", () => {
    useSettingsStore.getState().setTheme("sepia");
    expect(useSettingsStore.getState().theme).toBe("sepia");
    expect(document.documentElement.getAttribute("data-theme")).toBe("sepia");
  });

  it("setTheme to light removes data-theme attribute", () => {
    useSettingsStore.getState().setTheme("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    useSettingsStore.getState().setTheme("light");
    expect(useSettingsStore.getState().theme).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  });

  it("cycleTheme cycles light -> sepia -> dark -> system -> light (#154)", () => {
    // THEME_ORDER: ["system", "light", "sepia", "dark"]
    // Starting from "light" (index 1)
    expect(useSettingsStore.getState().theme).toBe("light");

    useSettingsStore.getState().cycleTheme();
    expect(useSettingsStore.getState().theme).toBe("sepia");
    expect(document.documentElement.getAttribute("data-theme")).toBe("sepia");

    useSettingsStore.getState().cycleTheme();
    expect(useSettingsStore.getState().theme).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    useSettingsStore.getState().cycleTheme();
    expect(useSettingsStore.getState().theme).toBe("system");

    useSettingsStore.getState().cycleTheme();
    expect(useSettingsStore.getState().theme).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  });

  // --- Persist middleware tests ---

  it("persists fontScale and theme to localStorage after state change", () => {
    useSettingsStore.getState().setFontScale(1.3);
    useSettingsStore.getState().setTheme("dark");
    const stored = JSON.parse(localStorage.getItem("ap-settings") || "{}");
    expect(stored.state.fontScale).toBe(1.3);
    expect(stored.state.theme).toBe("dark");
  });

  it("restores fontScale and theme from localStorage on rehydrate", async () => {
    localStorage.setItem(
      "ap-settings",
      JSON.stringify({
        state: {
          fontScale: 1.3,
          theme: "dark",
          wpUrl: "https://example.com",
          wooUrl: "",
          wooUseSameUrl: true,
          contentType: "posts",
          perPage: 20,
          wooPerPage: 20,
          useProxy: false,
        },
        version: 1,
      }),
    );
    await useSettingsStore.persist.rehydrate();
    expect(useSettingsStore.getState().fontScale).toBe(1.3);
    expect(useSettingsStore.getState().theme).toBe("dark");
  });

  it("does not persist wooKey or wooSecret to localStorage", () => {
    useSettingsStore.getState().setWooKey("ck_secret_key");
    useSettingsStore.getState().setWooSecret("cs_secret_value");
    const stored = JSON.parse(localStorage.getItem("ap-settings") || "{}");
    expect(stored.state).not.toHaveProperty("wooKey");
    expect(stored.state).not.toHaveProperty("wooSecret");
  });

  it("does not persist activePanel to localStorage", () => {
    useSettingsStore.getState().openPanel("settings");
    const stored = JSON.parse(localStorage.getItem("ap-settings") || "{}");
    expect(stored.state).not.toHaveProperty("activePanel");
  });

  it("onRehydrateStorage reapplies --font-scale and data-theme to DOM", async () => {
    localStorage.setItem(
      "ap-settings",
      JSON.stringify({
        state: {
          fontScale: 1.4,
          theme: "sepia",
          wpUrl: "https://example.com",
          wooUrl: "",
          wooUseSameUrl: true,
          contentType: "posts",
          perPage: 20,
          wooPerPage: 20,
          useProxy: false,
        },
        version: 1,
      }),
    );
    document.documentElement.style.removeProperty("--font-scale");
    document.documentElement.removeAttribute("data-theme");
    await useSettingsStore.persist.rehydrate();
    expect(
      document.documentElement.style.getPropertyValue("--font-scale"),
    ).toBe("1.4");
    expect(document.documentElement.getAttribute("data-theme")).toBe("sepia");
  });

  // --- Security regression: #247 ---

  it("credentials default to empty strings, never from env vars (#247)", () => {
    const s = useSettingsStore.getState();
    expect(s.wooKey).toBe("");
    expect(s.wooSecret).toBe("");
  });

  it("credentials remain empty after rehydration from localStorage (#247)", async () => {
    localStorage.setItem(
      "ap-settings",
      JSON.stringify({
        state: {
          fontScale: 1,
          theme: "light",
          wpUrl: "https://www.ancillarypower.com",
          wooUrl: "",
          wooUseSameUrl: true,
          contentType: "posts",
          perPage: 20,
          wooPerPage: 20,
          useProxy: false,
          wooKey: "ck_leaked",
          wooSecret: "cs_leaked",
        },
        version: 1,
      }),
    );
    await useSettingsStore.persist.rehydrate();
    expect(useSettingsStore.getState().wooKey).toBe("");
    expect(useSettingsStore.getState().wooSecret).toBe("");
  });

  // --- Zod validation regression: #448 ---

  it("rejects corrupted contentType from localStorage and falls back to defaults (regression #448)", async () => {
    localStorage.setItem(
      "ap-settings",
      JSON.stringify({
        state: {
          contentType: "INVALID",
          perPage: -5,
          wooPerPage: 999,
          theme: "neon",
          fontScale: 99,
          wpUrl: "https://corrupted.example.com",
          wooUrl: "",
          wooUseSameUrl: true,
          useProxy: false,
        },
        version: 1,
      }),
    );
    await useSettingsStore.persist.rehydrate();
    const s = useSettingsStore.getState();
    // All fields should be defaults because the blob failed validation
    expect(s.contentType).toBe("posts");
    expect(s.perPage).toBe(20);
    expect(s.wooPerPage).toBe(20);
    expect(s.theme).toBe("light");
    expect(s.fontScale).toBe(1);
    // wpUrl should NOT be the corrupted value
    expect(s.wpUrl).not.toBe("https://corrupted.example.com");
  });

  it("accepts valid persisted settings after Zod validation (regression #448)", async () => {
    localStorage.setItem(
      "ap-settings",
      JSON.stringify({
        state: {
          contentType: "pages",
          perPage: 50,
          wooPerPage: 30,
          theme: "dark",
          fontScale: 1.2,
          wpUrl: "https://valid.example.com",
          wooUrl: "https://woo.example.com",
          wooUseSameUrl: false,
          useProxy: true,
        },
        version: 1,
      }),
    );
    await useSettingsStore.persist.rehydrate();
    const s = useSettingsStore.getState();
    expect(s.contentType).toBe("pages");
    expect(s.perPage).toBe(50);
    expect(s.wooPerPage).toBe(30);
    expect(s.theme).toBe("dark");
    expect(s.fontScale).toBe(1.2);
    expect(s.wpUrl).toBe("https://valid.example.com");
    expect(s.wooUrl).toBe("https://woo.example.com");
    expect(s.wooUseSameUrl).toBe(false);
    expect(s.useProxy).toBe(true);
  });
});
