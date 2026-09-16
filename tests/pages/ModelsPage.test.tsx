import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";

vi.mock("@/components/models/ModelViewer", () => ({
  ModelViewer: (props: { name: string }) =>
    createElement("div", { "data-testid": "model-viewer" }, props.name),
}));

const { mockToastError } = vi.hoisted(() => ({ mockToastError: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: mockToastError } }));

const mockSaveModel = vi.fn().mockResolvedValue(1);
const mockGetAllModelMeta = vi.fn().mockResolvedValue([]);
const mockDeleteModel = vi.fn().mockResolvedValue(undefined);
const mockDeleteMultipleModels = vi.fn().mockResolvedValue(undefined);
const mockDeleteAllModels = vi.fn().mockResolvedValue(undefined);

vi.mock("@/hooks/useModelDB", () => ({
  saveModel: (...args: unknown[]) => mockSaveModel(...args),
  getAllModelMeta: (...args: unknown[]) => mockGetAllModelMeta(...args),
  deleteModel: (...args: unknown[]) => mockDeleteModel(...args),
  deleteMultipleModels: (...args: unknown[]) => mockDeleteMultipleModels(...args),
  deleteAllModels: (...args: unknown[]) => mockDeleteAllModels(...args),
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
      expect(screen.getByLabelText("Select cube.glb")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText("Select cube.glb"));
    fireEvent.click(screen.getByLabelText("Select sphere.obj"));
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
      expect(screen.getByLabelText("Select cube.glb")).toBeInTheDocument();
      expect(screen.getByLabelText("Select sphere.obj")).toBeInTheDocument();
      expect(screen.getByLabelText("Select plane.stl")).toBeInTheDocument();
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
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByLabelText("Select cube.glb")).toBeInTheDocument();
    });

    // Find and click the remove button for the first model
    const removeButtons = screen.getAllByRole("button", { name: /remove|\u522A\u9664|\u00d7|\u2715/i });
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringContaining("\u522A\u9664\u6A21\u578B\u5931\u6557")
      );
    });
    // Model should still be in the list (UI not updated on failure)
    expect(screen.getByLabelText("Select cube.glb")).toBeInTheDocument();
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to delete model:",
      1,
      expect.any(Error)
    );
    errorSpy.mockRestore();
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
    // Models should still be in the list
    expect(screen.getByLabelText("Select cube.glb")).toBeInTheDocument();
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to delete all models:",
      expect.any(Error)
    );
    errorSpy.mockRestore();
    vi.restoreAllMocks();
  });
});
