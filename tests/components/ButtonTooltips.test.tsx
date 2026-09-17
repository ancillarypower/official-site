import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/context/I18nContext", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    lang: "zh" as const,
    toggleLang: vi.fn(),
  }),
}));

vi.mock("@/stores/settingsStore", () => {
  const state = {
    fontScale: 1,
    setFontScale: vi.fn(),
  };
  return {
    useSettingsStore: Object.assign(
      (sel?: (s: typeof state) => unknown) => (sel ? sel(state) : state),
      { getState: () => state },
    ),
  };
});

vi.mock("@/components/models/ModelViewer", () => ({
  ModelViewer: () => <div data-testid="mock-viewer" />,
}));

describe("Button tooltips (Issue #329)", () => {
  it("FontSizeControl buttons have title attributes", async () => {
    const { FontSizeControl } = await import("@/components/ui/FontSizeControl");
    render(<FontSizeControl />);

    expect(screen.getByLabelText("a11y_decrease_font")).toHaveAttribute("title", "a11y_decrease_font");
    expect(screen.getByLabelText("a11y_increase_font")).toHaveAttribute("title", "a11y_increase_font");
    expect(screen.getByLabelText("a11y_reset_font")).toHaveAttribute("title", "a11y_reset_font");
  });

  it("ModelCard remove and select buttons have title attributes", async () => {
    const { ModelCard } = await import("@/components/models/ModelCard");
    render(
      <ModelCard
        name="cube.glb"
        size={2048}
        ext="glb"
        modelId={1}
        selected={false}
        onToggleSelect={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    // t mock returns key as-is; interpolated params are not in the key string
    const removeBtn = screen.getByRole("button", { name: "models_remove_label" });
    expect(removeBtn).toHaveAttribute("title", "models_remove_label");

    const selectCheckbox = screen.getByRole("checkbox", { name: "models_select_label" });
    expect(selectCheckbox.closest("label")).toHaveAttribute("title", "models_select_label");
  });
});
