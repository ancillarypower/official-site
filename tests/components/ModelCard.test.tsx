import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";
import { ModelCard } from "@/components/models/ModelCard";

// Mock ModelViewer to avoid Three.js in jsdom
vi.mock("@/components/models/ModelViewer", () => ({
  ModelViewer: ({ name }: { name: string }) => (
    <div data-testid="model-viewer">{name}</div>
  ),
}));

const defaultProps = {
  name: "test-model.glb",
  size: 5_242_880,
  ext: "glb",
  data: new ArrayBuffer(8),
  onRemove: vi.fn(),
};

describe("ModelCard", () => {
  it("renders model name", () => {
    render(
      <I18nProvider>
        <ModelCard {...defaultProps} />
      </I18nProvider>,
    );
    expect(screen.getByText("test-model.glb")).toBeInTheDocument();
  });

  it("renders file size in MB", () => {
    render(
      <I18nProvider>
        <ModelCard {...defaultProps} />
      </I18nProvider>,
    );
    expect(screen.getByText("5.00 MB")).toBeInTheDocument();
  });

  it("renders small file size correctly", () => {
    render(
      <I18nProvider>
        <ModelCard {...defaultProps} size={524288} />
      </I18nProvider>,
    );
    expect(screen.getByText("0.50 MB")).toBeInTheDocument();
  });

  it("renders remove button with accessible label", () => {
    render(
      <I18nProvider>
        <ModelCard {...defaultProps} />
      </I18nProvider>,
    );
    expect(
      screen.getByLabelText("Remove test-model.glb"),
    ).toBeInTheDocument();
  });

  it("calls onRemove when remove button is clicked", () => {
    const onRemove = vi.fn();
    render(
      <I18nProvider>
        <ModelCard {...defaultProps} onRemove={onRemove} />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByLabelText("Remove test-model.glb"));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("renders ModelViewer component", () => {
    render(
      <I18nProvider>
        <ModelCard {...defaultProps} />
      </I18nProvider>,
    );
    expect(screen.getByTestId("model-viewer")).toBeInTheDocument();
  });
});
