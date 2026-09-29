import { useState, useEffect } from "react";

interface StorageQuota { used: number; total: number; percentage: number; }

export function useStorageQuota(): { quota: StorageQuota | null; error: boolean } {
  const [quota, setQuota] = useState<StorageQuota | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    async function check() {
      if (!navigator.storage?.estimate) return;
      try {
        const est = await navigator.storage.estimate();
        const used = est.usage ?? 0;
        const total = est.quota ?? 0;
        setQuota({ used, total, percentage: total > 0 ? (used / total) * 100 : 0 });
        setError(false);
      } catch (err) {
        console.warn('[StorageQuota] estimate() failed:', err);
        setError(true);
      }
    }
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, []);
  return { quota, error };
}
