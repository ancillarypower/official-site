import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";

vi.mock("@/components/models/ModelViewer", () => ({
  ModelViewer: (props: { name: string }) =>
    createElement("div", { "data-testid": "model-viewer" }, props.name),
}));

const { mockSaveModel, mockGetAllModels, mockDeleteModel } = vi.hoisted(() => ({
  mockSaveModel: vi.fn(),
  mockGetAllModels: vi.fn(),
  mockDeleteModel: vi.fn(),
}));

vi.mock("@/hooks/useModelDB", () => ({
  saveModel: (...args: unknown[]) => mockSaveModel(...args),
  getAllModels: () => mockGetAllModels(),
  deleteModel: (...args: unknown[]) => mockDeleteModel(...args),
}));

import ModelsPage from "@/pages/ModelsPage";

describe("ModelsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllModels.mockResolvedValue([]);
    mockSaveModel.mockResolvedValue(1);
    mockDeleteModel.mockResolvedValue(undefined);
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

  it("loads and displays models from IndexedDB", async () => {
    mockGetAllModels.mockResolvedValue([
      { id: 1, name: "model.glb", size: 1_048_576, ext: "glb", data: new ArrayBuffer(8), timestamp: Date.now() },
      { id: 2, name: "scene.obj", size: 2_097_152, ext: "obj", data: new ArrayBuffer(8), timestamp: Date.now() },
    ]);

    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByText("2 \u500B\u5DF2\u8F09\u5165")).toBeInTheDocument();
    });
    expect(screen.getByText("model.glb")).toBeInTheDocument();
    expect(screen.getByText("scene.obj")).toBeInTheDocument();
  });

  it("filters out records with null id", async () => {
    mockGetAllModels.mockResolvedValue([
      { id: null, name: "bad.glb", size: 512, ext: "glb", data: new ArrayBuffer(8), timestamp: Date.now() },
      { id: 1, name: "good.glb", size: 1024, ext: "glb", data: new ArrayBuffer(8), timestamp: Date.now() },
    ]);

    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByText("1 \u500B\u5DF2\u8F09\u5165")).toBeInTheDocument();
    });
    expect(screen.queryByText("bad.glb")).not.toBeInTheDocument();
    expect(screen.getByText("good.glb")).toBeInTheDocument();
  });

  it("shows persisted note when models are loaded", async () => {
    mockGetAllModels.mockResolvedValue([
      { id: 1, name: "model.glb", size: 1024, ext: "glb", data: new ArrayBuffer(8), timestamp: Date.now() },
    ]);

    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByText("1 \u500B\u5DF2\u8F09\u5165")).toBeInTheDocument();
    });
    expect(screen.getByText(/\uD83D\uDCBE/)).toBeInTheDocument();
  });

  it("does not show persisted note when no models", async () => {
    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByText("0 \u500B\u5DF2\u8F09\u5165")).toBeInTheDocument();
    });
    expect(screen.queryByText(/\uD83D\uDCBE/)).not.toBeInTheDocument();
  });
});
