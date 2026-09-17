import { describe, it, expect } from "vitest";
import { migrateSettings, SETTINGS_VERSION } from "@/stores/settingsStore";

describe("migrateSettings", () => {
  it("returns persisted data as-is for version 0", () => {
    const persisted = { fontScale: 1.3, theme: "dark", wpUrl: "https://example.com" };
    const result = migrateSettings(persisted, 0);
    expect(result).toEqual(persisted);
  });

  it("returns persisted data as-is for version 1", () => {
    const persisted = { fontScale: 1.1, theme: "sepia" };
    const result = migrateSettings(persisted, 1);
    expect(result).toEqual(persisted);
  });

  it("handles empty object for version 0", () => {
    const result = migrateSettings({}, 0);
    expect(result).toEqual({});
  });

  it("SETTINGS_VERSION is 1", () => {
    expect(SETTINGS_VERSION).toBe(1);
  });
});
