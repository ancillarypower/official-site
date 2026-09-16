import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";

vi.mock("@/context/I18nContext", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock("@/components/models/ModelViewer", () => ({
  ModelViewer: (props: { name: string }) =>
    createElement("div", { "data-testid": "model-viewer", "data-name": props.name }),
}));

import { ModelCard } from "@/components/models/ModelCard";

const defaultProps = {
  name: "robot.glb",
  size: 5_242_880,
  ext: "glb",
  modelId: 1,
  onRemove: vi.fn(),
};

describe("ModelCard", () => {
  it("renders model name", () => {
    render(createElement(ModelCard, defaultProps));
    expect(screen.getByText("robot.glb")).toBeInTheDocument();
  });

  it("shows file size in MB with two decimal places", () => {
    render(createElement(ModelCard, defaultProps));
    expect(screen.getByText("5.00 MB")).toBeInTheDocument();
  });

  it("formats small file sizes correctly", () => {
    render(createElement(ModelCard, { ...defaultProps, size: 524_288 }));
    expect(screen.getByText("0.50 MB")).toBeInTheDocument();
  });

  it("renders remove button with correct aria-label", () => {
    render(createElement(ModelCard, defaultProps));
    expect(screen.getByLabelText("Remove robot.glb")).toBeInTheDocument();
  });

  it("calls onRemove when remove button is clicked", () => {
    const onRemove = vi.fn();
    render(createElement(ModelCard, { ...defaultProps, onRemove }));
    fireEvent.click(screen.getByLabelText("Remove robot.glb"));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("passes name to ModelViewer after expanding", () => {
    render(createElement(ModelCard, defaultProps));
    fireEvent.click(screen.getByText("models_view_3d"));
    expect(screen.getByTestId("model-viewer")).toHaveAttribute("data-name", "robot.glb");
  });

  it("renders remove button with \u2715 text", () => {
    render(createElement(ModelCard, defaultProps));
    expect(screen.getByLabelText("Remove robot.glb")).toHaveTextContent("\u2715");
  });

  it("does not render checkbox when onToggleSelect is not provided", () => {
    render(createElement(ModelCard, defaultProps));
    expect(screen.queryByLabelText(/Select/)).not.toBeInTheDocument();
  });

  it("renders checkbox when onToggleSelect is provided", () => {
    render(createElement(ModelCard, { ...defaultProps, onToggleSelect: vi.fn() }));
    expect(screen.getByLabelText("Select robot.glb")).toBeInTheDocument();
  });

  it("checkbox reflects selected prop", () => {
    render(createElement(ModelCard, { ...defaultProps, selected: true, onToggleSelect: vi.fn() }));
    const checkbox = screen.getByLabelText("Select robot.glb") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it("calls onToggleSelect when checkbox is clicked", () => {
    const onToggleSelect = vi.fn();
    render(createElement(ModelCard, { ...defaultProps, onToggleSelect }));
    fireEvent.click(screen.getByLabelText("Select robot.glb"));
    expect(onToggleSelect).toHaveBeenCalledOnce();
  });

  it("applies selected styling when selected", () => {
    const { container } = render(createElement(ModelCard, { ...defaultProps, selected: true, onToggleSelect: vi.fn() }));
    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain("border-accent");
    expect(card.className).toContain("ring-2");
  });

  it("does not apply selected styling when not selected", () => {
    const { container } = render(createElement(ModelCard, { ...defaultProps, selected: false, onToggleSelect: vi.fn() }));
    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain("border-border-subtle");
    expect(card.className).not.toContain("ring-2");
  });

  // Regression tests for click-to-activate (Issue #79)
  it("does not render ModelViewer by default", () => {
    render(createElement(ModelCard, defaultProps));
    expect(screen.queryByTestId("model-viewer")).not.toBeInTheDocument();
    expect(screen.getByText("models_view_3d")).toBeInTheDocument();
    expect(screen.getByText("GLB")).toBeInTheDocument();
  });

  it("renders ModelViewer after clicking expand button", () => {
    render(createElement(ModelCard, defaultProps));
    expect(screen.queryByTestId("model-viewer")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("models_view_3d"));
    expect(screen.getByTestId("model-viewer")).toBeInTheDocument();
  });

  it("removes ModelViewer after clicking collapse button", () => {
    render(createElement(ModelCard, defaultProps));
    fireEvent.click(screen.getByText("models_view_3d"));
    expect(screen.getByTestId("model-viewer")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("models_collapse_3d"));
    expect(screen.queryByTestId("model-viewer")).not.toBeInTheDocument();
    expect(screen.getByText("models_view_3d")).toBeInTheDocument();
  });
});
