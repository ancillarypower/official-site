import { describe, it, expect, beforeEach } from "vitest";
import { useSettingsStore } from "@/stores/settingsStore";

describe("settingsStore", () => {
  beforeEach(() => {
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

  it("cycleTheme cycles light -> sepia -> dark -> light", () => {
    expect(useSettingsStore.getState().theme).toBe("light");

    useSettingsStore.getState().cycleTheme();
    expect(useSettingsStore.getState().theme).toBe("sepia");
    expect(document.documentElement.getAttribute("data-theme")).toBe("sepia");

    useSettingsStore.getState().cycleTheme();
    expect(useSettingsStore.getState().theme).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    useSettingsStore.getState().cycleTheme();
    expect(useSettingsStore.getState().theme).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  });
});
