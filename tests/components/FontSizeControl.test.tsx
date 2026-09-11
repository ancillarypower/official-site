import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FontSizeControl } from "@/components/ui/FontSizeControl";
import { useSettingsStore } from "@/stores/settingsStore";

describe("FontSizeControl", () => {
  beforeEach(() => {
    document.documentElement.style.removeProperty("--font-scale");
    useSettingsStore.setState({ fontScale: 1 });
  });

  it("renders A- button, slider, A+ button, and percentage", () => {
    render(<FontSizeControl />);
    expect(screen.getByLabelText("Decrease font size")).toBeInTheDocument();
    expect(screen.getByLabelText("Increase font size")).toBeInTheDocument();
    expect(screen.getByLabelText("Font size")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("decreases font scale on A- click", () => {
    render(<FontSizeControl />);
    fireEvent.click(screen.getByLabelText("Decrease font size"));
    expect(useSettingsStore.getState().fontScale).toBeCloseTo(0.9, 1);
  });

  it("increases font scale on A+ click", () => {
    render(<FontSizeControl />);
    fireEvent.click(screen.getByLabelText("Increase font size"));
    expect(useSettingsStore.getState().fontScale).toBeCloseTo(1.1, 1);
  });

  it("updates via range slider", () => {
    render(<FontSizeControl />);
    fireEvent.change(screen.getByLabelText("Font size"), {
      target: { value: "1.3" },
    });
    expect(useSettingsStore.getState().fontScale).toBeCloseTo(1.3, 1);
  });

  it("sets --font-scale on :root (consumed by #main-content zoom, not html font-size)", () => {
    render(<FontSizeControl />);
    fireEvent.click(screen.getByLabelText("Increase font size"));
    // --font-scale is set on documentElement (:root); CSS applies it as
    // zoom on #main-content only, so the Navbar (including this control)
    // stays at its original size and position.
    expect(
      document.documentElement.style.getPropertyValue("--font-scale")
    ).toBe("1.1");
  });

  it("does not apply inline font-size or zoom to the control container", () => {
    render(<FontSizeControl />);
    fireEvent.click(screen.getByLabelText("Increase font size"));
    // The control lives in the Navbar (outside #main-content),
    // so its own container must not carry any scaling styles.
    const container = screen.getByLabelText("Decrease font size").closest("div");
    expect(container?.style.fontSize).toBeFalsy();
    expect(container?.style.zoom).toBeFalsy();
  });
});
