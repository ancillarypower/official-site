import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useStorageQuota } from "@/hooks/useStorageQuota";

// Do NOT use fake timers here. The hook calls estimate() on mount
// (synchronous useEffect -> async check()). Fake timers prevent
// the mocked Promise from resolving, causing 5s test timeouts.

describe("useStorageQuota", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns quota when Storage API is available", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: vi.fn().mockResolvedValue({ usage: 5000, quota: 100000 }),
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useStorageQuota());

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(result.current?.used).toBe(5000);
    expect(result.current?.total).toBe(100000);
    expect(result.current?.percentage).toBe(5);
  });

  it("returns null when Storage API is unavailable", () => {
    Object.defineProperty(navigator, "storage", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useStorageQuota());
    expect(result.current).toBeNull();
  });

  it("handles estimate() throwing gracefully", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: vi.fn().mockRejectedValue(new Error("Not supported")),
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useStorageQuota());
    // Should remain null, not throw
    expect(result.current).toBeNull();
  });

  it("calculates percentage correctly with zero quota", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: vi.fn().mockResolvedValue({ usage: 0, quota: 0 }),
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useStorageQuota());

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(result.current?.percentage).toBe(0);
  });
});
