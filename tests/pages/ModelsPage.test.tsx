import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";

vi.mock("@/components/models/ModelViewer", () => ({
  ModelViewer: ({ name }: { name: string }) => <div data-testid="model-viewer">{name}</div>,
}));

vi.mock("@/hooks/useModelDB", () => ({
  saveModel: vi.fn().mockResolvedValue(1),
  getAllModels: vi.fn().mockResolvedValue([]),
  deleteModel: vi.fn().mockResolvedValue(undefined),
}));

import ModelsPage from "@/pages/ModelsPage";

function renderPage() {
  return render(
    <I18nProvider>
      <ModelsPage />
    </I18nProvider>
  );
}

describe("ModelsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders models title", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("3D \u6A21\u578B")).toBeInTheDocument();
    });
  });

  it("shows zero loaded count initially", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("0 \u500B\u5DF2\u8F09\u5165")).toBeInTheDocument();
    });
  });

  it("renders upload component", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/\u62D6\u653E 3D \u6A21\u578B/)).toBeInTheDocument();
    });
  });

  it("does not show persistence message when no models loaded", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.queryByText(/\u5DF2\u5132\u5B58\u81F3\u672C\u6A5F/)).toBeNull();
    });
  });
});
