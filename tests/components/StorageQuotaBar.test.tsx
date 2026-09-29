import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";

vi.mock("@/hooks/useStorageQuota", () => ({
  useStorageQuota: vi.fn(),
}));

import { StorageQuotaBar } from "@/components/models/StorageQuotaBar";
import { useStorageQuota } from "@/hooks/useStorageQuota";

const mockUseStorageQuota = vi.mocked(useStorageQuota);

function withI18n(ui: React.ReactElement) {
  return <I18nProvider>{ui}</I18nProvider>;
}

describe("StorageQuotaBar", () => {
  it("returns null when quota is null and no error", () => {
    mockUseStorageQuota.mockReturnValue({ quota: null, error: false });
    const { container } = render(withI18n(<StorageQuotaBar />));
    expect(container.innerHTML).toBe("");
  });

  it("renders storage info when quota is available", () => {
    mockUseStorageQuota.mockReturnValue({ quota: { used: 52428800, total: 1073741824, percentage: 4.88 }, error: false });
    render(withI18n(<StorageQuotaBar />));
    expect(screen.getByText(/儲存空間/)).toBeInTheDocument();
    expect(screen.getByText(/50\.0 MB/)).toBeInTheDocument();
    expect(screen.getByText(/1\.00 GB/)).toBeInTheDocument();
  });

  it("uses accent color for normal usage", () => {
    mockUseStorageQuota.mockReturnValue({ quota: { used: 100, total: 1000, percentage: 10 }, error: false });
    const { container } = render(withI18n(<StorageQuotaBar />));
    const bar = container.querySelector("[style]");
    expect(bar?.className).toContain("bg-accent");
    expect(bar?.className).not.toContain("bg-danger");
  });

  it("uses danger color above 80%", () => {
    mockUseStorageQuota.mockReturnValue({ quota: { used: 900, total: 1000, percentage: 90 }, error: false });
    const { container } = render(withI18n(<StorageQuotaBar />));
    const bar = container.querySelector("[style]");
    expect(bar?.className).toContain("bg-danger");
  });

  it("renders error message when error is true and quota is null (regression #565)", () => {
    mockUseStorageQuota.mockReturnValue({ quota: null, error: true });
    render(withI18n(<StorageQuotaBar />));
    expect(screen.getByText(/發生意外錯誤/)).toBeInTheDocument();
  });
});
