import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";
import { ModelUpload } from "@/components/models/ModelUpload";

function renderUpload(onFilesSelected = vi.fn()) {
  return {
    ...render(<I18nProvider><ModelUpload onFilesSelected={onFilesSelected} /></I18nProvider>),
    onFilesSelected,
  };
}

describe("ModelUpload", () => {
  it("renders upload area with instructions", () => {
    renderUpload();
    expect(screen.getByText("📦")).toBeInTheDocument();
    expect(screen.getByText(/拖放 3D 模型/)).toBeInTheDocument();
    expect(screen.getByText(/\.glb/)).toBeInTheDocument();
  });

  it("has correct aria-label", () => {
    renderUpload();
    expect(screen.getByRole("button")).toHaveAttribute("aria-label");
  });

  it("filters out unsupported file extensions", () => {
    const handler = vi.fn();
    renderUpload(handler);
    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    const validFile = new File(["data"], "model.glb", { type: "model/gltf-binary" });
    const invalidFile = new File(["data"], "image.png", { type: "image/png" });
    Object.defineProperty(input, "files", { value: [validFile, invalidFile] });
    fireEvent.change(input);
    expect(handler).toHaveBeenCalledTimes(1);
    const calledFiles = handler.mock.calls[0]?.[0] as File[];
    expect(calledFiles).toHaveLength(1);
    expect(calledFiles[0]?.name).toBe("model.glb");
  });

  it("accepts all supported extensions", () => {
    const handler = vi.fn();
    renderUpload(handler);
    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [new File([""], "a.glb"), new File([""], "b.gltf"), new File([""], "c.obj"), new File([""], "d.stl")] });
    fireEvent.change(input);
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0]?.[0] as File[]).length).toBe(4);
  });
});
