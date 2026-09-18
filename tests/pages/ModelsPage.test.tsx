import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";

vi.mock("@/components/models/ModelViewer", () => ({
  ModelViewer: (props: { name: string }) =>
    createElement("div", { "data-testid": "model-viewer" }, props.name),
}));

// Capture the latest onFilesSelected callback from ModelUpload
let latestOnFilesSelected: ((files: File[]) => Promise<void> | void) | null = null;
vi.mock("@/components/models/ModelUpload", () => ({
  ModelUpload: (props: { onFilesSelected: (files: File[]) => Promise<void> | void; disabled?: boolean }) => {
    latestOnFilesSelected = props.onFilesSelected;
    return createElement("div", { "data-testid": "model-upload" },
      props.disabled ? "\u6B63\u5728\u5132\u5B58\u6A21\u578B..." : "\u62D6\u653E 3D \u6A21\u578B\u81F3\u6B64\u8655\u6216\u9EDE\u64CA\u700F\u89BD"
    );
  },
}));

const { mockToastError } = vi.hoisted(() => ({ mockToastError: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: mockToastError } }));

const mockSaveModel = vi.fn().mockResolvedValue(1);
const mockGetAllModelMeta = vi.fn().mockResolvedValue([]);
const mockDeleteModel = vi.fn().mockResolvedValue(undefined);
const mockDeleteMultipleModels = vi.fn().mockResolvedValue(undefined);
const mockDeleteAllModels = vi.fn().mockResolvedValue(undefined);
const mockRenameModel = vi.fn().mockResolvedValue(undefined);

vi.mock("@/hooks/useModelDB", () => ({
  saveModel: (...args: unknown[]) => mockSaveModel(...args),
  getAllModelMeta: (...args: unknown[]) => mockGetAllModelMeta(...args),
  deleteModel: (...args: unknown[]) => mockDeleteModel(...args),
  deleteMultipleModels: (...args: unknown[]) => mockDeleteMultipleModels(...args),
  deleteAllModels: (...args: unknown[]) => mockDeleteAllModels(...args),
  renameModel: (...args: unknown[]) => mockRenameModel(...args),
}));

import ModelsPage from "@/pages/ModelsPage";

const sampleModels = [
  { id: 1, name: "cube.glb", size: 1_048_576, ext: "glb", timestamp: Date.now() },
  { id: 2, name: "sphere.obj", size: 2_097_152, ext: "obj", timestamp: Date.now() },
  { id: 3, name: "plane.stl", size: 524_288, ext: "stl", timestamp: Date.now() },
];

describe("ModelsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllModelMeta.mockResolvedValue([]);
    latestOnFilesSelected = null;
    localStorage.removeItem("model_sort_order");
  });

  it("renders models title", async () => {
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByText("3D \u6A21\u578B")).toBeInTheDocument();
    });
  });

  it("shows zero loaded count", async () => {
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByText("0 \u500B\u5DF2\u8F09\u5165")).toBeInTheDocument();
    });
  });

  it("renders upload component", async () => {
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByText(/\u62D6\u653E 3D \u6A21\u578B/)).toBeInTheDocument();
    });
  });

  it("does not show toolbar when no models loaded", async () => {
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByText("0 \u500B\u5DF2\u8F09\u5165")).toBeInTheDocument();
    });
    expect(screen.queryByText("\u5168\u9078")).not.toBeInTheDocument();
    expect(screen.queryByText(/\u5168\u90E8\u522A\u9664/)).not.toBeInTheDocument();
  });

  it("shows toolbar with select all and delete all when models exist", async () => {
    mockGetAllModelMeta.mockResolvedValue(sampleModels);
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByText("\u5168\u9078")).toBeInTheDocument();
    });
    expect(screen.getByText(/\u5168\u90E8\u522A\u9664/)).toBeInTheDocument();
  });

  it("toggles select all and shows delete selected button", async () => {
    mockGetAllModelMeta.mockResolvedValue(sampleModels);
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByText("\u5168\u9078")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("\u5168\u9078"));
    expect(screen.getByText("\u53D6\u6D88\u5168\u9078")).toBeInTheDocument();
    expect(screen.getByText(/\u522A\u9664\u9078\u53D6\uFF083\uFF09/)).toBeInTheDocument();
  });

  it("calls deleteAllModels on confirm", async () => {
    mockGetAllModelMeta.mockResolvedValue(sampleModels);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByText(/\u5168\u90E8\u522A\u9664/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/\u5168\u90E8\u522A\u9664/));
    await waitFor(() => {
      expect(mockDeleteAllModels).toHaveBeenCalledOnce();
    });
    vi.restoreAllMocks();
  });

  it("does not delete all when confirm is cancelled", async () => {
    mockGetAllModelMeta.mockResolvedValue(sampleModels);
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByText(/\u5168\u90E8\u522A\u9664/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/\u5168\u90E8\u522A\u9664/));
    expect(mockDeleteAllModels).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("calls deleteMultipleModels for selected items on confirm", async () => {
    mockGetAllModelMeta.mockResolvedValue(sampleModels);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByLabelText(/\u9078\u53D6\u300Ccube\.glb\u300D/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText(/\u9078\u53D6\u300Ccube\.glb\u300D/));
    fireEvent.click(screen.getByLabelText(/\u9078\u53D6\u300Csphere\.obj\u300D/));
    await waitFor(() => {
      expect(screen.getByText(/\u522A\u9664\u9078\u53D6\uFF082\uFF09/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/\u522A\u9664\u9078\u53D6\uFF082\uFF09/));
    await waitFor(() => {
      expect(mockDeleteMultipleModels).toHaveBeenCalledWith([1, 2]);
    });
    vi.restoreAllMocks();
  });

  it("renders checkboxes on each model card", async () => {
    mockGetAllModelMeta.mockResolvedValue(sampleModels);
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByLabelText(/\u9078\u53D6\u300Ccube\.glb\u300D/)).toBeInTheDocument();
      expect(screen.getByLabelText(/\u9078\u53D6\u300Csphere\.obj\u300D/)).toBeInTheDocument();
      expect(screen.getByLabelText(/\u9078\u53D6\u300Cplane\.stl\u300D/)).toBeInTheDocument();
    });
  });

  it("shows toast.error when IndexedDB is unavailable", async () => {
    mockGetAllModelMeta.mockRejectedValue(new Error("IndexedDB access denied"));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledOnce();
    });
    expect(mockToastError).toHaveBeenCalledWith(
      expect.stringContaining("\u8CC7\u6599\u5EAB")
    );
    expect(warnSpy).toHaveBeenCalledWith(
      "[ModelsPage] IndexedDB unavailable:",
      expect.any(Error)
    );
    expect(screen.getByText("0 \u500B\u5DF2\u8F09\u5165")).toBeInTheDocument();
    warnSpy.mockRestore();
  });

  it("shows toast.error with filename when saveModel fails", async () => {
    mockSaveModel.mockRejectedValueOnce(new Error("QuotaExceededError"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByText(/\u62D6\u653E 3D \u6A21\u578B/)).toBeInTheDocument();
    });

    const file = new File(["data"], "test.glb", { type: "model/gltf-binary" });
    await act(async () => {
      await latestOnFilesSelected!([file]);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });
    expect(mockToastError).toHaveBeenCalledWith(
      expect.stringContaining("test.glb")
    );
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("shows toast.error and keeps model in list when deleteModel fails", async () => {
    mockGetAllModelMeta.mockResolvedValue(sampleModels);
    mockDeleteModel.mockRejectedValueOnce(new Error("IndexedDB delete failed"));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByLabelText(/\u9078\u53D6\u300Ccube\.glb\u300D/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /\u79FB\u9664\u300Ccube\.glb\u300D/ }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringContaining("\u522A\u9664\u6A21\u578B\u5931\u6557")
      );
    });
    expect(screen.getByLabelText(/\u9078\u53D6\u300Ccube\.glb\u300D/)).toBeInTheDocument();
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to delete model:",
      1,
      expect.any(Error)
    );
    errorSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("shows toast.error when deleteAllModels fails", async () => {
    mockGetAllModelMeta.mockResolvedValue(sampleModels);
    mockDeleteAllModels.mockRejectedValueOnce(new Error("IndexedDB clear failed"));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByText(/\u5168\u90E8\u522A\u9664/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/\u5168\u90E8\u522A\u9664/));
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringContaining("\u522A\u9664\u6A21\u578B\u5931\u6557")
      );
    });
    expect(screen.getByLabelText(/\u9078\u53D6\u300Ccube\.glb\u300D/)).toBeInTheDocument();
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to delete all models:",
      expect.any(Error)
    );
    errorSpy.mockRestore();
    vi.restoreAllMocks();
  });

  // Regression tests for individual delete confirmation (Issue #328)
  it("calls deleteModel on individual remove when confirmed", async () => {
    mockGetAllModelMeta.mockResolvedValue(sampleModels);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByLabelText(/\u9078\u53D6\u300Ccube\.glb\u300D/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /\u79FB\u9664\u300Ccube\.glb\u300D/ }));

    await waitFor(() => {
      expect(mockDeleteModel).toHaveBeenCalledWith(1);
    });
    vi.restoreAllMocks();
  });

  it("does not call deleteModel when individual remove confirm is cancelled", async () => {
    mockGetAllModelMeta.mockResolvedValue(sampleModels);
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByLabelText(/\u9078\u53D6\u300Ccube\.glb\u300D/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /\u79FB\u9664\u300Ccube\.glb\u300D/ }));

    expect(mockDeleteModel).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/\u9078\u53D6\u300Ccube\.glb\u300D/)).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  // Drag-and-drop reorder tests (Issue #338)
  it("shows drag hint when models exist", async () => {
    mockGetAllModelMeta.mockResolvedValue(sampleModels);
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByText("\u62D6\u66F3\u5361\u7247\u53EF\u91CD\u65B0\u6392\u5E8F")).toBeInTheDocument();
    });
  });

  it("reorders models on drag and drop", async () => {
    mockGetAllModelMeta.mockResolvedValue(sampleModels);
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByLabelText(/\u9078\u53D6\u300Ccube\.glb\u300D/)).toBeInTheDocument();
    });

    const cards = document.querySelectorAll("[draggable='true']");
    fireEvent.dragStart(cards[0]);
    fireEvent.dragEnter(cards[2]);
    fireEvent.dragEnd(cards[0]);

    await waitFor(() => {
      const removeButtons = screen.getAllByRole("button", { name: /\u79FB\u9664/ });
      const order = removeButtons.map((btn) => {
        const match = btn.getAttribute("aria-label")?.match(/\u300C(.+?)\u300D/);
        return match ? match[1] : "";
      });
      expect(order).toEqual(["sphere.obj", "plane.stl", "cube.glb"]);
    });
  });

  it("restores saved order from localStorage on mount", async () => {
    localStorage.setItem("model_sort_order", JSON.stringify([3, 1, 2]));
    mockGetAllModelMeta.mockResolvedValue(sampleModels);
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      const removeButtons = screen.getAllByRole("button", { name: /\u79FB\u9664/ });
      const order = removeButtons.map((btn) => {
        const match = btn.getAttribute("aria-label")?.match(/\u300C(.+?)\u300D/);
        return match ? match[1] : "";
      });
      expect(order).toEqual(["plane.stl", "cube.glb", "sphere.obj"]);
    });
  });

  // Rename tests (Issue #335)
  it("enters edit mode when model name is clicked", async () => {
    mockGetAllModelMeta.mockResolvedValue(sampleModels);
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByText("cube.glb")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("cube.glb"));
    await waitFor(() => {
      expect(screen.getByDisplayValue("cube.glb")).toBeInTheDocument();
    });
  });

  it("saves renamed model on Enter", async () => {
    mockGetAllModelMeta.mockResolvedValue(sampleModels);
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByText("cube.glb")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("cube.glb"));
    const input = screen.getByDisplayValue("cube.glb");
    fireEvent.change(input, { target: { value: "renamed-model.glb" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      expect(mockRenameModel).toHaveBeenCalledWith(1, "renamed-model.glb");
    });
  });

  it("cancels rename on Escape without saving", async () => {
    mockGetAllModelMeta.mockResolvedValue(sampleModels);
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByText("cube.glb")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("cube.glb"));
    const input = screen.getByDisplayValue("cube.glb");
    fireEvent.change(input, { target: { value: "new-name.glb" } });
    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() => {
      expect(screen.getByText("cube.glb")).toBeInTheDocument();
    });
    expect(mockRenameModel).not.toHaveBeenCalled();
  });

  // Toggle all expand/collapse tests (Issue #330)
  it("shows expand/collapse all button when models exist", async () => {
    mockGetAllModelMeta.mockResolvedValue(sampleModels);
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByText("\u5168\u90E8\u5C55\u958B")).toBeInTheDocument();
    });
  });

  it("toggles all model viewers on expand all click", async () => {
    mockGetAllModelMeta.mockResolvedValue(sampleModels);
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByText("\u5168\u90E8\u5C55\u958B")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("\u5168\u90E8\u5C55\u958B"));
    await waitFor(() => {
      expect(screen.getAllByTestId("model-viewer")).toHaveLength(3);
    });
    expect(screen.getByText("\u5168\u90E8\u6536\u5408")).toBeInTheDocument();
    fireEvent.click(screen.getByText("\u5168\u90E8\u6536\u5408"));
    await waitFor(() => {
      expect(screen.queryAllByTestId("model-viewer")).toHaveLength(0);
    });
    expect(screen.getByText("\u5168\u90E8\u5C55\u958B")).toBeInTheDocument();
  });

  // Duplicate upload check tests (Issue #108)
  it("skips duplicate file when user cancels replace confirm", async () => {
    mockGetAllModelMeta.mockResolvedValue(sampleModels);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByText("3 \u500B\u5DF2\u8F09\u5165")).toBeInTheDocument();
    });

    const file = new File(["new data"], "cube.glb", { type: "model/gltf-binary" });
    await act(async () => {
      await latestOnFilesSelected!([file]);
    });

    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining("cube.glb")
    );
    expect(mockDeleteModel).not.toHaveBeenCalled();
    expect(mockSaveModel).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("replaces duplicate file when user confirms", async () => {
    mockGetAllModelMeta.mockResolvedValue(sampleModels);
    mockSaveModel.mockResolvedValueOnce(10);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByText("3 \u500B\u5DF2\u8F09\u5165")).toBeInTheDocument();
    });

    const file = new File(["new data"], "cube.glb", { type: "model/gltf-binary" });
    await act(async () => {
      await latestOnFilesSelected!([file]);
    });

    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining("cube.glb")
    );
    expect(mockDeleteModel).toHaveBeenCalledWith(1);
    expect(mockSaveModel).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

});
