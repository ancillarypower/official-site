import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useStorageQuota } from "@/hooks/useStorageQuota";

describe("useStorageQuota", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns quota when Storage API is available", async () => {
    Object.defineProperty(navigator, "storage", {
      value: { estimate: vi.fn().mockResolvedValue({ usage: 5000, quota: 100000 }) },
      writable: true, configurable: true,
    });
    const { result } = renderHook(() => useStorageQuota());
    await waitFor(() => expect(result.current.quota).not.toBeNull());
    expect(result.current.quota?.used).toBe(5000);
    expect(result.current.quota?.total).toBe(100000);
    expect(result.current.quota?.percentage).toBe(5);
    expect(result.current.error).toBe(false);
  });

  it("returns no error when Storage API is unavailable", () => {
    Object.defineProperty(navigator, "storage", { value: undefined, writable: true, configurable: true });
    const { result } = renderHook(() => useStorageQuota());
    expect(result.current.quota).toBeNull();
    expect(result.current.error).toBe(false);
  });

  it("sets error when estimate() rejects (regression #565)", async () => {
    Object.defineProperty(navigator, "storage", {
      value: { estimate: vi.fn().mockRejectedValue(new Error("Not supported")) },
      writable: true, configurable: true,
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { result } = renderHook(() => useStorageQuota());
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.quota).toBeNull();
    expect(warn).toHaveBeenCalledWith("[StorageQuota] estimate() failed:", expect.any(Error));
  });

  it("calculates percentage correctly with zero quota", async () => {
    Object.defineProperty(navigator, "storage", {
      value: { estimate: vi.fn().mockResolvedValue({ usage: 0, quota: 0 }) },
      writable: true, configurable: true,
    });
    const { result } = renderHook(() => useStorageQuota());
    await waitFor(() => expect(result.current.quota).not.toBeNull());
    expect(result.current.quota?.percentage).toBe(0);
    expect(result.current.error).toBe(false);
  });
});
