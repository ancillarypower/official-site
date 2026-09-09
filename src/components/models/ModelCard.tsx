import { ModelViewer } from "./ModelViewer";

interface ModelCardProps { name: string; size: number; ext: string; data: ArrayBuffer; onRemove: () => void; }

export function ModelCard({ name, size, ext, data, onRemove }: ModelCardProps) {
  return (
    <div className="animate-fade-in overflow-hidden rounded-xl border border-border-subtle bg-surface-raised">
      <ModelViewer name={name} ext={ext} data={data} />
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex-1 truncate text-sm font-semibold">{name}</span>
        <span className="text-[0.7rem] text-tertiary">{(size / 1_048_576).toFixed(2)} MB</span>
        <button onClick={onRemove} className="flex h-7 w-7 items-center justify-center rounded bg-surface-sunken text-xs text-tertiary transition-colors hover:bg-[oklch(90%_0.04_25)] hover:text-[oklch(45%_0.12_25)]" aria-label={`Remove ${name}`}>✕</button>
      </div>
    </div>
  );
}
