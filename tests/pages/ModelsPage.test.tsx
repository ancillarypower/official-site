import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";

vi.mock("@/components/models/ModelViewer", () => ({
  ModelViewer: (props: { name: string }) =>
    createElement("div", { "data-testid": "model-viewer" }, props.name),
}));

const mockGetAllModels = vi.fn().mockResolvedValue([]);
const mockDeleteModel = vi.fn().mockResolvedValue(undefined);
const mockDeleteMultipleModels = vi.fn().mockResolvedValue(undefined);
const mockDeleteAllModels = vi.fn().mockResolvedValue(undefined);

vi.mock("@/hooks/useModelDB", () => ({
  saveModel: vi.fn().mockResolvedValue(1),
  getAllModels: (...args: unknown[]) => mockGetAllModels(...args),
  deleteModel: (...args: unknown[]) => mockDeleteModel(...args),
  deleteMultipleModels: (...args: unknown[]) => mockDeleteMultipleModels(...args),
  deleteAllModels: (...args: unknown[]) => mockDeleteAllModels(...args),
}));

import ModelsPage from "@/pages/ModelsPage";

const sampleModels = [
  { id: 1, name: "cube.glb", size: 1_048_576, ext: "glb", data: new ArrayBuffer(8), timestamp: Date.now() },
  { id: 2, name: "sphere.obj", size: 2_097_152, ext: "obj", data: new ArrayBuffer(8), timestamp: Date.now() },
  { id: 3, name: "plane.stl", size: 524_288, ext: "stl", data: new ArrayBuffer(8), timestamp: Date.now() },
];

describe("ModelsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllModels.mockResolvedValue([]);
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
    mockGetAllModels.mockResolvedValue(sampleModels);
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByText("\u5168\u9078")).toBeInTheDocument();
    });
    expect(screen.getByText(/\u5168\u90E8\u522A\u9664/)).toBeInTheDocument();
  });

  it("toggles select all and shows delete selected button", async () => {
    mockGetAllModels.mockResolvedValue(sampleModels);
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByText("\u5168\u9078")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("\u5168\u9078"));
    expect(screen.getByText("\u53D6\u6D88\u5168\u9078")).toBeInTheDocument();
    expect(screen.getByText(/\u522A\u9664\u9078\u53D6\uFF083\uFF09/)).toBeInTheDocument();
  });

  it("calls deleteAllModels on confirm", async () => {
    mockGetAllModels.mockResolvedValue(sampleModels);
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
    mockGetAllModels.mockResolvedValue(sampleModels);
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
    mockGetAllModels.mockResolvedValue(sampleModels);
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
    mockGetAllModels.mockResolvedValue(sampleModels);
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByLabelText("Select cube.glb")).toBeInTheDocument();
      expect(screen.getByLabelText("Select sphere.obj")).toBeInTheDocument();
      expect(screen.getByLabelText("Select plane.stl")).toBeInTheDocument();
    });
  });
});
