import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { I18nProvider } from "@/context/I18nContext";
import { ModelCard } from "@/components/models/ModelCard";

vi.mock("@/components/models/ModelViewer", () => ({
  ModelViewer: (props: { name: string }) =>
    createElement("div", { "data-testid": "model-viewer" }, props.name),
}));

function withI18n(ui: React.ReactElement) {
  return <I18nProvider>{ui}</I18nProvider>;
}

describe("ModelCard", () => {
  const data = new ArrayBuffer(1048576);

  it("renders model name and size", () => {
    render(withI18n(<ModelCard name="test.glb" size={1048576} ext="glb" data={data} onRemove={vi.fn()} />));
    expect(screen.getByText("test.glb")).toBeInTheDocument();
    expect(screen.getByText("1.00 MB")).toBeInTheDocument();
  });

  it("renders ModelViewer", () => {
    render(withI18n(<ModelCard name="model.obj" size={2097152} ext="obj" data={data} onRemove={vi.fn()} />));
    expect(screen.getByTestId("model-viewer")).toBeInTheDocument();
  });

  it("calls onRemove", () => {
    const handler = vi.fn();
    render(withI18n(<ModelCard name="test.stl" size={512000} ext="stl" data={data} onRemove={handler} />));
    fireEvent.click(screen.getByLabelText("Remove test.stl"));
    expect(handler).toHaveBeenCalledOnce();
  });

  it("formats size correctly", () => {
    render(withI18n(<ModelCard name="tiny.glb" size={524288} ext="glb" data={data} onRemove={vi.fn()} />));
    expect(screen.getByText("0.50 MB")).toBeInTheDocument();
  });
});
