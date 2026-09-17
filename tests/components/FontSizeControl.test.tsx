import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";
import { FontSizeControl } from "@/components/ui/FontSizeControl";
import { useSettingsStore } from "@/stores/settingsStore";

function withI18n(ui: React.ReactElement) {
  return <I18nProvider>{ui}</I18nProvider>;
}

describe("FontSizeControl", () => {
  beforeEach(() => {
    document.documentElement.style.removeProperty("--font-scale");
    useSettingsStore.setState({ fontScale: 1 });
  });

  it("renders A- button, slider, A+ button, and percentage", () => {
    render(withI18n(<FontSizeControl />));
    expect(screen.getByLabelText("縮小字體")).toBeInTheDocument();
    expect(screen.getByLabelText("放大字體")).toBeInTheDocument();
    expect(screen.getByLabelText("字體大小")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("decreases font scale on A- click", () => {
    render(withI18n(<FontSizeControl />));
    fireEvent.click(screen.getByLabelText("縮小字體"));
    expect(useSettingsStore.getState().fontScale).toBeCloseTo(0.9, 1);
  });

  it("increases font scale on A+ click", () => {
    render(withI18n(<FontSizeControl />));
    fireEvent.click(screen.getByLabelText("放大字體"));
    expect(useSettingsStore.getState().fontScale).toBeCloseTo(1.1, 1);
  });

  it("updates via range slider", () => {
    render(withI18n(<FontSizeControl />));
    fireEvent.change(screen.getByLabelText("字體大小"), {
      target: { value: "1.3" },
    });
    expect(useSettingsStore.getState().fontScale).toBeCloseTo(1.3, 1);
  });

  it("sets --font-scale on :root (consumed by #scalable-content zoom)", () => {
    render(withI18n(<FontSizeControl />));
    fireEvent.click(screen.getByLabelText("放大字體"));
    expect(
      document.documentElement.style.getPropertyValue("--font-scale")
    ).toBe("1.1");
  });

  it("does not apply inline font-size or zoom to the control container", () => {
    render(withI18n(<FontSizeControl />));
    fireEvent.click(screen.getByLabelText("放大字體"));
    const container = screen.getByLabelText("縮小字體").closest("div");
    expect(container?.style.fontSize).toBeFalsy();
    expect(container?.style.zoom).toBeFalsy();
  });

  it("renders reset button", () => {
    render(withI18n(<FontSizeControl />));
    expect(screen.getByLabelText("重設字體大小")).toBeInTheDocument();
  });

  it("resets font scale to 1 on reset click", () => {
    useSettingsStore.setState({ fontScale: 1.3 });
    render(withI18n(<FontSizeControl />));
    fireEvent.click(screen.getByLabelText("重設字體大小"));
    expect(useSettingsStore.getState().fontScale).toBeCloseTo(1, 1);
  });
});
