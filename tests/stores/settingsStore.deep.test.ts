import { describe, it, expect, beforeEach } from "vitest";
import { useSettingsStore } from "@/stores/settingsStore";

describe("settingsStore deep tests", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      wpUrl: "https://test.example.com",
      wooKey: "",
      wooSecret: "",
      wooUrl: "",
      wooUseSameUrl: true,
      useProxy: false,
      contentType: "posts",
      perPage: 20,
      wooPerPage: 20,
      fontScale: 1,
      activePanel: null,
    });
  });

  it("setWpUrl updates the URL", () => {
    useSettingsStore.getState().setWpUrl("https://new.example.com");
    expect(useSettingsStore.getState().wpUrl).toBe("https://new.example.com");
  });

  it("setContentType updates content type", () => {
    useSettingsStore.getState().setContentType("pages");
    expect(useSettingsStore.getState().contentType).toBe("pages");
  });

  it("setPerPage updates per page", () => {
    useSettingsStore.getState().setPerPage(50);
    expect(useSettingsStore.getState().perPage).toBe(50);
  });

  it("setWooPerPage updates woo per page", () => {
    useSettingsStore.getState().setWooPerPage(100);
    expect(useSettingsStore.getState().wooPerPage).toBe(100);
  });

  it("setUseProxy toggles proxy", () => {
    useSettingsStore.getState().setUseProxy(true);
    expect(useSettingsStore.getState().useProxy).toBe(true);
  });

  it("setWooKey and setWooSecret update credentials", () => {
    useSettingsStore.getState().setWooKey("ck_test");
    useSettingsStore.getState().setWooSecret("cs_test");
    expect(useSettingsStore.getState().wooKey).toBe("ck_test");
    expect(useSettingsStore.getState().wooSecret).toBe("cs_test");
  });

  it("setWooUrl updates woo URL", () => {
    useSettingsStore.getState().setWooUrl("https://shop.example.com");
    expect(useSettingsStore.getState().wooUrl).toBe("https://shop.example.com");
  });

  it("setWooUseSameUrl toggles same URL flag", () => {
    useSettingsStore.getState().setWooUseSameUrl(false);
    expect(useSettingsStore.getState().wooUseSameUrl).toBe(false);
  });

  it("openPanel sets activePanel", () => {
    useSettingsStore.getState().openPanel("settings");
    expect(useSettingsStore.getState().activePanel).toBe("settings");
    useSettingsStore.getState().openPanel("cart");
    expect(useSettingsStore.getState().activePanel).toBe("cart");
  });

  it("closePanel clears activePanel", () => {
    useSettingsStore.getState().openPanel("settings");
    useSettingsStore.getState().closePanel();
    expect(useSettingsStore.getState().activePanel).toBeNull();
  });

  it("setFontScale clamps between 0.7 and 1.5", () => {
    useSettingsStore.getState().setFontScale(0.3);
    expect(useSettingsStore.getState().fontScale).toBe(0.7);
    useSettingsStore.getState().setFontScale(2.0);
    expect(useSettingsStore.getState().fontScale).toBe(1.5);
    useSettingsStore.getState().setFontScale(1.2);
    expect(useSettingsStore.getState().fontScale).toBe(1.2);
  });

  it("getWooBaseUrl returns wpUrl when wooUseSameUrl is true", () => {
    useSettingsStore.setState({ wpUrl: "https://wp.example.com", wooUseSameUrl: true });
    expect(useSettingsStore.getState().getWooBaseUrl()).toBe("https://wp.example.com");
  });

  it("getWooBaseUrl returns wooUrl when wooUseSameUrl is false", () => {
    useSettingsStore.setState({
      wooUseSameUrl: false,
      wooUrl: "https://shop.example.com",
    });
    expect(useSettingsStore.getState().getWooBaseUrl()).toBe("https://shop.example.com");
  });

  it("getWooBaseUrl strips trailing slashes", () => {
    useSettingsStore.setState({ wpUrl: "https://wp.example.com///", wooUseSameUrl: true });
    expect(useSettingsStore.getState().getWooBaseUrl()).toBe("https://wp.example.com");
  });

  it("getWooBaseUrl adds https if missing", () => {
    useSettingsStore.setState({ wpUrl: "wp.example.com", wooUseSameUrl: true });
    expect(useSettingsStore.getState().getWooBaseUrl()).toBe("https://wp.example.com");
  });

  it("getWooBaseUrl returns empty string for empty URL", () => {
    useSettingsStore.setState({ wpUrl: "", wooUseSameUrl: true });
    expect(useSettingsStore.getState().getWooBaseUrl()).toBe("");
  });
});
