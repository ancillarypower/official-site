import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/hooks/useStorageQuota", () => ({
  useStorageQuota: vi.fn(),
}));

import { StorageQuotaBar } from "@/components/models/StorageQuotaBar";
import { useStorageQuota } from "@/hooks/useStorageQuota";

const mockUseStorageQuota = vi.mocked(useStorageQuota);

describe("StorageQuotaBar", () => {
  it("returns null when quota is null", () => {
    mockUseStorageQuota.mockReturnValue(null);
    const { container } = render(<StorageQuotaBar />);
    expect(container.innerHTML).toBe("");
  });

  it("renders storage info when quota is available", () => {
    mockUseStorageQuota.mockReturnValue({ used: 52428800, total: 1073741824, percentage: 4.88 });
    render(<StorageQuotaBar />);
    expect(screen.getByText(/Storage/)).toBeInTheDocument();
    expect(screen.getByText(/50\.0 MB/)).toBeInTheDocument();
    expect(screen.getByText(/1\.00 GB/)).toBeInTheDocument();
  });

  it("uses accent color for normal usage", () => {
    mockUseStorageQuota.mockReturnValue({ used: 100, total: 1000, percentage: 10 });
    const { container } = render(<StorageQuotaBar />);
    const bar = container.querySelector("[style]");
    expect(bar?.className).toContain("bg-accent");
    expect(bar?.className).not.toContain("bg-danger");
  });

  it("uses danger color above 80%", () => {
    mockUseStorageQuota.mockReturnValue({ used: 900, total: 1000, percentage: 90 });
    const { container } = render(<StorageQuotaBar />);
    const bar = container.querySelector("[style]");
    expect(bar?.className).toContain("bg-danger");
  });
});
