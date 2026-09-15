import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";
import { ModelUpload } from "@/components/models/ModelUpload";

const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: mockToastError },
}));

function renderUpload(onFilesSelected = vi.fn()) {
  return {
    ...render(<I18nProvider><ModelUpload onFilesSelected={onFilesSelected} /></I18nProvider>),
    onFilesSelected,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

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

  it("rejects files exceeding MAX_MODEL_SIZE and shows toast", () => {
    const handler = vi.fn();
    renderUpload(handler);
    const input = document.querySelector("input[type='file']") as HTMLInputElement;

    const bigFile = new File(["x"], "huge.glb", { type: "model/gltf-binary" });
    Object.defineProperty(bigFile, "size", { value: 200 * 1024 * 1024 }); // 200 MB

    Object.defineProperty(input, "files", { value: [bigFile] });
    fireEvent.change(input);

    expect(handler).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledTimes(1);
    expect(mockToastError).toHaveBeenCalledWith(
      expect.stringContaining("huge.glb")
    );
  });

  it("passes small files but rejects oversized ones in mixed input", () => {
    const handler = vi.fn();
    renderUpload(handler);
    const input = document.querySelector("input[type='file']") as HTMLInputElement;

    const smallFile = new File(["data"], "small.glb", { type: "model/gltf-binary" });
    const bigFile = new File(["x"], "big.obj", { type: "model/obj" });
    Object.defineProperty(bigFile, "size", { value: 150 * 1024 * 1024 }); // 150 MB

    Object.defineProperty(input, "files", { value: [smallFile, bigFile] });
    fireEvent.change(input);

    expect(handler).toHaveBeenCalledTimes(1);
    const calledFiles = handler.mock.calls[0]?.[0] as File[];
    expect(calledFiles).toHaveLength(1);
    expect(calledFiles[0]?.name).toBe("small.glb");
    expect(mockToastError).toHaveBeenCalledTimes(1);
    expect(mockToastError).toHaveBeenCalledWith(
      expect.stringContaining("big.obj")
    );
  });

  it("accepts files exactly at the size limit", () => {
    const handler = vi.fn();
    renderUpload(handler);
    const input = document.querySelector("input[type='file']") as HTMLInputElement;

    const exactFile = new File(["data"], "exact.glb", { type: "model/gltf-binary" });
    Object.defineProperty(exactFile, "size", { value: 100 * 1024 * 1024 }); // exactly 100 MB

    Object.defineProperty(input, "files", { value: [exactFile] });
    fireEvent.change(input);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(mockToastError).not.toHaveBeenCalled();
  });
});
