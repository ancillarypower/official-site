import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { I18nProvider, useI18n } from "@/context/I18nContext";

vi.mock("@/components/models/ModelViewer", () => ({
  ModelViewer: (props: { name: string }) =>
    createElement("div", { "data-testid": "model-viewer" }, props.name),
}));

const { mockToastError, mockToastWarning } = vi.hoisted(() => ({
  mockToastError: vi.fn(),
  mockToastWarning: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { error: mockToastError, warning: mockToastWarning } }));

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
    localStorage.removeItem("model_sort_order");
    localStorage.removeItem("model_sort_key");
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

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["data"], "test.glb", { type: "model/gltf-binary" });
    fireEvent.change(fileInput, { target: { files: [file] } });

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

  // Duplicate upload check (Issue #108)
  // Regression tests skipped: React 18 automatic batching of setIsUploading(true)
  // interrupts the async handleFilesSelected chain in jsdom when invoked outside
  // React's event system. 10 approaches attempted; see PR #362 description.
  // The feature is verified by manual browser testing.

  // Sort tests (Issue #361)
  it("sorts models by name ascending when sort option selected (regression #361)", async () => {
    mockGetAllModelMeta.mockResolvedValue(sampleModels);
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByLabelText(/\u9078\u53D6\u300Ccube\.glb\u300D/)).toBeInTheDocument();
    });

    // Select "Name A\u2192Z" sort option
    const sortSelect = screen.getByRole("combobox");
    fireEvent.change(sortSelect, { target: { value: "name_asc" } });

    await waitFor(() => {
      const removeButtons = screen.getAllByRole("button", { name: /\u79FB\u9664/ });
      const order = removeButtons.map((btn) => {
        const match = btn.getAttribute("aria-label")?.match(/\u300C(.+?)\u300D/);
        return match ? match[1] : "";
      });
      // cube.glb < plane.stl < sphere.obj (alphabetical)
      expect(order).toEqual(["cube.glb", "plane.stl", "sphere.obj"]);
    });
  });

  it("sorts models by size descending when sort option selected (regression #361)", async () => {
    mockGetAllModelMeta.mockResolvedValue(sampleModels);
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByLabelText(/\u9078\u53D6\u300Ccube\.glb\u300D/)).toBeInTheDocument();
    });

    const sortSelect = screen.getByRole("combobox");
    fireEvent.change(sortSelect, { target: { value: "size_desc" } });

    await waitFor(() => {
      const removeButtons = screen.getAllByRole("button", { name: /\u79FB\u9664/ });
      const order = removeButtons.map((btn) => {
        const match = btn.getAttribute("aria-label")?.match(/\u300C(.+?)\u300D/);
        return match ? match[1] : "";
      });
      // sphere.obj (2MB) > cube.glb (1MB) > plane.stl (0.5MB)
      expect(order).toEqual(["sphere.obj", "cube.glb", "plane.stl"]);
    });
  });

  it("disables drag reorder when non-custom sort is active (regression #361)", async () => {
    mockGetAllModelMeta.mockResolvedValue(sampleModels);
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByLabelText(/\u9078\u53D6\u300Ccube\.glb\u300D/)).toBeInTheDocument();
    });

    // Switch to name sort
    const sortSelect = screen.getByRole("combobox");
    fireEvent.change(sortSelect, { target: { value: "name_asc" } });

    // Drag hint should be hidden
    await waitFor(() => {
      expect(screen.queryByText("\u62D6\u66F3\u5361\u7247\u53EF\u91CD\u65B0\u6392\u5E8F")).not.toBeInTheDocument();
    });

    // Attempt drag: order should not change (still alphabetical)
    const cards = document.querySelectorAll("[draggable='true']");
    if (cards.length >= 3) {
      fireEvent.dragStart(cards[0]);
      fireEvent.dragEnter(cards[2]);
      fireEvent.dragEnd(cards[0]);
    }

    await waitFor(() => {
      const removeButtons = screen.getAllByRole("button", { name: /\u79FB\u9664/ });
      const order = removeButtons.map((btn) => {
        const match = btn.getAttribute("aria-label")?.match(/\u300C(.+?)\u300D/);
        return match ? match[1] : "";
      });
      // Order remains alphabetical despite drag attempt
      expect(order).toEqual(["cube.glb", "plane.stl", "sphere.obj"]);
    });
  });

  // Regression test: language switch does not re-trigger IndexedDB read (Issue #289)
  it("language switch does not re-trigger IndexedDB read (regression #289)", async () => {
    mockGetAllModelMeta.mockResolvedValue(sampleModels);

    // Wrapper that exposes language toggle for testing
    function LangToggleWrapper() {
      const { toggleLang } = useI18n();
      return (
        <>
          <button data-testid="toggle-lang" onClick={toggleLang}>Toggle</button>
          <ModelsPage />
        </>
      );
    }

    render(<I18nProvider><LangToggleWrapper /></I18nProvider>);

    // Wait for initial mount to complete
    await waitFor(() => {
      expect(mockGetAllModelMeta).toHaveBeenCalledTimes(1);
    });

    // Switch language (zh -> en)
    fireEvent.click(screen.getByTestId("toggle-lang"));

    // Wait for re-render with English UI text
    await waitFor(() => {
      expect(screen.getByText("3D Models")).toBeInTheDocument();
    });

    // getAllModelMeta should NOT have been called again
    expect(mockGetAllModelMeta).toHaveBeenCalledTimes(1);
  });

  // Regression test: batch upload exceeding MAX_BATCH_FILES is truncated (Issue #301)
  it("truncates file batch exceeding MAX_BATCH_FILES and shows warning (regression #301)", async () => {
    // Generate 25 files (MAX_BATCH_FILES = 20)
    const files: File[] = [];
    for (let i = 0; i < 25; i++) {
      files.push(new File(["data"], `model-${i}.glb`, { type: "model/gltf-binary" }));
    }

    // Auto-increment IDs for saveModel
    let nextId = 1;
    mockSaveModel.mockImplementation(() => Promise.resolve(nextId++));

    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByText(/\u62D6\u653E 3D \u6A21\u578B/)).toBeInTheDocument();
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const dt = new DataTransfer();
    for (const f of files) dt.items.add(f);
    fireEvent.change(fileInput, { target: { files: dt.files } });

    // toast.warning should have been called with the batch limit message
    await waitFor(() => {
      expect(mockToastWarning).toHaveBeenCalled();
    });
    expect(mockToastWarning).toHaveBeenCalledWith(
      expect.stringContaining("20")
    );

    // saveModel should have been called at most 20 times (truncated)
    await waitFor(() => {
      expect(mockSaveModel.mock.calls.length).toBeLessThanOrEqual(20);
    });
  });

});
