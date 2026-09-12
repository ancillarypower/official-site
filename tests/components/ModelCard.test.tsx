import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";

const { MockModelViewer } = vi.hoisted(() => ({
  MockModelViewer: vi.fn(({ name }: { name: string }) => (
    <div data-testid="model-viewer">{name}</div>
  )),
}));

vi.mock("@/components/models/ModelViewer", () => ({
  ModelViewer: MockModelViewer,
}));

import { ModelCard } from "@/components/models/ModelCard";

function renderCard(overrides: Record<string, unknown> = {}) {
  const props = {
    name: "test-model.glb",
    size: 5_242_880,
    ext: "glb",
    data: new ArrayBuffer(8),
    onRemove: vi.fn(),
    ...overrides,
  };
  return {
    props,
    ...render(
      <I18nProvider>
        <ModelCard {...props} />
      </I18nProvider>,
    ),
  };
}

describe("ModelCard", () => {
  it("renders model name", () => {
    renderCard();
    expect(screen.getByText("test-model.glb")).toBeInTheDocument();
  });

  it("renders file size in MB", () => {
    renderCard();
    expect(screen.getByText("5.00 MB")).toBeInTheDocument();
  });

  it("renders small file size correctly", () => {
    renderCard({ size: 524288 });
    expect(screen.getByText("0.50 MB")).toBeInTheDocument();
  });

  it("renders remove button with accessible label", () => {
    renderCard();
    expect(screen.getByLabelText("Remove test-model.glb")).toBeInTheDocument();
  });

  it("calls onRemove when remove button is clicked", () => {
    const { props } = renderCard();
    fireEvent.click(screen.getByLabelText("Remove test-model.glb"));
    expect(props.onRemove).toHaveBeenCalledOnce();
  });

  it("renders ModelViewer component", () => {
    renderCard();
    expect(screen.getByTestId("model-viewer")).toBeInTheDocument();
  });
});
