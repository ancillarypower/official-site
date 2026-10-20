import { createElement } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/context/I18nContext";

const { mockFiles, mockSaveModel, mockReplaceModel, mockGetAllModelMeta, mockDeleteModel, mockToastError } = vi.hoisted(() => ({
  mockFiles: vi.fn<() => File[]>(),
  mockSaveModel: vi.fn(),
  mockReplaceModel: vi.fn(),
  mockGetAllModelMeta: vi.fn(),
  mockDeleteModel: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("@/components/models/ModelUpload", () => ({
  ModelUpload: ({ onFilesSelected, disabled }: { onFilesSelected: (files: File[]) => void; disabled?: boolean }) =>
    createElement("button", { type: "button", disabled, onClick: () => onFilesSelected(mockFiles()) }, "Upload files"),
}));
vi.mock("@/components/models/ModelViewer", () => ({
  ModelViewer: ({ name }: { name: string }) => createElement("div", { "data-testid": "model-viewer" }, name),
}));
vi.mock("sonner", () => ({ toast: { error: mockToastError, warning: vi.fn() } }));
vi.mock("@/hooks/useModelDB", () => ({
  saveModel: (...args: unknown[]) => mockSaveModel(...args),
  replaceModel: (...args: unknown[]) => mockReplaceModel(...args),
  getAllModelMeta: (...args: unknown[]) => mockGetAllModelMeta(...args),
  deleteModel: (...args: unknown[]) => mockDeleteModel(...args),
  deleteMultipleModels: vi.fn(),
  deleteAllModels: vi.fn(),
  renameModel: vi.fn(),
}));
vi.mock("@/lib/hash", () => ({ computeFileHash: vi.fn().mockResolvedValue("") }));

import ModelsPage from "@/pages/ModelsPage";

const initialModels = [
  { id: 1, name: "cube.glb", size: 3, ext: "glb", timestamp: 1 },
  { id: 2, name: "sphere.obj", size: 2, ext: "obj", timestamp: 2 },
];

function file(name: string): File {
  const result = new File([name], name);
  Object.defineProperty(result, "arrayBuffer", {
    value: async () => new TextEncoder().encode(name).buffer,
  });
  return result;
}

function renderPage() {
  return render(<I18nProvider><ModelsPage /></I18nProvider>);
}

function cardOrder(): string[] {
  return screen.getAllByRole("button", { name: /移除「|Remove "/ }).map((button) =>
    button.getAttribute("aria-label")?.match(/[「"](.+?)[」"]/u)?.[1] ?? "",
  );
}

function expandCard(name: string) {
  const card = screen.getByText(name).closest("[draggable]")!;
  fireEvent.click(within(card).getByRole("button", { name: "檢視 3D 模型" }));
}

async function loadCards() {
  await waitFor(() => expect(screen.getByLabelText(/選取「cube\.glb」/)).toBeInTheDocument());
}

describe("ModelsPage atomic replacement (Issue #602)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllModelMeta.mockResolvedValue(initialModels);
    mockSaveModel.mockResolvedValue(4);
    mockReplaceModel.mockResolvedValue(4);
    mockFiles.mockReturnValue([file("cube.glb")]);
    localStorage.removeItem("model_sort_order");
    localStorage.removeItem("model_sort_key");
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => vi.restoreAllMocks());

  it("retains the selected expanded card and custom order when replacement fails", async () => {
    localStorage.setItem("model_sort_order", JSON.stringify([2, 1]));
    const error = new Error("simulated quota failure");
    mockReplaceModel.mockRejectedValueOnce(error);
    mockSaveModel.mockRejectedValueOnce(error);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderPage();
    await loadCards();
    fireEvent.click(screen.getByLabelText(/選取「cube\.glb」/));
    expandCard("cube.glb");

    fireEvent.click(screen.getByRole("button", { name: "Upload files" }));

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining("cube.glb")));
    expect(screen.getByText("cube.glb")).toBeInTheDocument();
    expect(screen.getByLabelText(/選取「cube\.glb」/)).toBeChecked();
    expect(screen.getByTestId("model-viewer")).toBeInTheDocument();
    expect(cardOrder()).toEqual(["sphere.obj", "cube.glb"]);
    expect(localStorage.getItem("model_sort_order")).toBe(JSON.stringify([2, 1]));
    expect(mockReplaceModel).toHaveBeenCalledOnce();
    errorSpy.mockRestore();
  });

  it("keeps all old card state until replacement transaction resolves", async () => {
    localStorage.setItem("model_sort_order", JSON.stringify([2, 1]));
    let resolveReplacement!: (id: number) => void;
    mockReplaceModel.mockReturnValueOnce(new Promise<number>((resolve) => { resolveReplacement = resolve; }));
    renderPage();
    await loadCards();
    fireEvent.click(screen.getByLabelText(/選取「cube\.glb」/));
    expandCard("cube.glb");

    fireEvent.click(screen.getByRole("button", { name: "Upload files" }));
    await waitFor(() => expect(mockReplaceModel).toHaveBeenCalledOnce());

    expect(screen.getByLabelText(/選取「cube\.glb」/)).toBeChecked();
    expect(screen.getByTestId("model-viewer")).toBeInTheDocument();
    expect(cardOrder()).toEqual(["sphere.obj", "cube.glb"]);
    expect(localStorage.getItem("model_sort_order")).toBe(JSON.stringify([2, 1]));

    resolveReplacement(4);
    await waitFor(() => expect(screen.getByLabelText(/選取「cube\.glb」/)).not.toBeInTheDocument());
    expect(cardOrder()).toEqual(["sphere.obj", "cube.glb"]);
    expect(screen.queryByTestId("model-viewer")).not.toBeInTheDocument();
    expect(localStorage.getItem("model_sort_order")).toBe(JSON.stringify([2, 4]));
  });

  it("does not write when replacement is cancelled", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    renderPage();
    await loadCards();

    fireEvent.click(screen.getByRole("button", { name: "Upload files" }));

    await waitFor(() => expect(window.confirm).toHaveBeenCalledOnce());
    expect(mockReplaceModel).not.toHaveBeenCalled();
    expect(mockSaveModel).not.toHaveBeenCalled();
    expect(mockDeleteModel).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/選取「cube\.glb」/)).toBeInTheDocument();
  });

  it("continues with later files after one replacement fails", async () => {
    mockFiles.mockReturnValue([file("cube.glb"), file("new.obj")]);
    mockReplaceModel.mockRejectedValueOnce(new Error("simulated replacement failure"));
    mockSaveModel.mockResolvedValueOnce(4);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderPage();
    await loadCards();

    fireEvent.click(screen.getByRole("button", { name: "Upload files" }));

    await waitFor(() => expect(screen.getByText("new.obj")).toBeInTheDocument());
    expect(mockReplaceModel).toHaveBeenCalledOnce();
    expect(mockSaveModel).toHaveBeenCalledOnce();
    expect(mockSaveModel).toHaveBeenCalledWith("new.obj", expect.any(Number), "obj", expect.any(ArrayBuffer), "");
    expect(screen.getByLabelText(/選取「cube\.glb」/)).toBeInTheDocument();
    errorSpy.mockRestore();
  });
});
