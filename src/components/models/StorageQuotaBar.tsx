import { useStorageQuota } from "@/hooks/useStorageQuota";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function StorageQuotaBar() {
  const quota = useStorageQuota();
  if (!quota) return null;
  return (
    <div className="mt-3 rounded-md bg-surface-sunken px-3 py-2">
      <div className="mb-1 flex items-center justify-between text-[0.7rem] text-tertiary">
        <span>💾 Storage</span>
        <span>{formatBytes(quota.used)} / {formatBytes(quota.total)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border-default">
        <div className={`h-full rounded-full transition-all ${quota.percentage > 80 ? "bg-danger" : "bg-accent"}`} style={{ width: `${Math.min(quota.percentage, 100)}%` }} />
      </div>
    </div>
  );
}
