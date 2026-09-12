import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";

vi.mock("@/components/models/ModelViewer", () => ({
  ModelViewer: (props: { name: string }) =>
    createElement("div", { "data-testid": "model-viewer", "data-name": props.name }),
}));

import { ModelCard } from "@/components/models/ModelCard";

const defaultProps = {
  name: "robot.glb",
  size: 5_242_880,
  ext: "glb",
  data: new ArrayBuffer(8),
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

  it("passes name to ModelViewer", () => {
    render(createElement(ModelCard, defaultProps));
    expect(screen.getByTestId("model-viewer")).toHaveAttribute("data-name", "robot.glb");
  });

  it("renders remove button with \u2715 text", () => {
    render(createElement(ModelCard, defaultProps));
    expect(screen.getByLabelText("Remove robot.glb")).toHaveTextContent("\u2715");
  });
});
