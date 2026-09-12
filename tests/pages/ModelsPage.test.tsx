import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";

vi.mock("@/components/models/ModelViewer", () => ({
  ModelViewer: (props: { name: string }) =>
    createElement("div", { "data-testid": "model-viewer", "data-name": props.name }),
}));

const { mockGetAllModels } = vi.hoisted(() => ({
  mockGetAllModels: vi.fn(),
}));

vi.mock("@/hooks/useModelDB", () => ({
  saveModel: vi.fn().mockResolvedValue(1),
  getAllModels: () => mockGetAllModels(),
  deleteModel: vi.fn().mockResolvedValue(undefined),
}));

import ModelsPage from "@/pages/ModelsPage";

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

  it("loads and displays models from IndexedDB", async () => {
    mockGetAllModels.mockResolvedValue([
      { id: 1, name: "model.glb", size: 1_048_576, ext: "glb", data: new ArrayBuffer(8), timestamp: Date.now() },
      { id: 2, name: "scene.obj", size: 2_097_152, ext: "obj", data: new ArrayBuffer(8), timestamp: Date.now() },
    ]);

    render(<I18nProvider><ModelsPage /></I18nProvider>);
    await waitFor(() => {
      expect(screen.getByText("2 \u500B\u5DF2\u8F09\u5165")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Remove model.glb")).toBeInTheDocument();
    expect(screen.getByLabelText("Remove scene.obj")).toBeInTheDocument();
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
    expect(screen.queryByLabelText("Remove bad.glb")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Remove good.glb")).toBeInTheDocument();
  });
});
