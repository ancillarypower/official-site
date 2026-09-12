import { ModelViewer } from "./ModelViewer";

interface ModelCardProps {
  name: string;
  size: number;
  ext: string;
  data: ArrayBuffer;
  selected?: boolean;
  onToggleSelect?: () => void;
  onRemove: () => void;
}

export function ModelCard({ name, size, ext, data, selected = false, onToggleSelect, onRemove }: ModelCardProps) {
  return (
    <div className={`animate-fade-in overflow-hidden rounded-xl border bg-surface-raised transition-colors ${
      selected ? "border-accent ring-2 ring-accent/30" : "border-border-subtle"
    }`}>
      <div className="relative">
        <ModelViewer name={name} ext={ext} data={data} />
        {onToggleSelect && (
          <label className="absolute left-2 top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded bg-surface-raised/80 backdrop-blur-sm">
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              className="h-4 w-4 accent-accent"
              aria-label={`Select ${name}`}
            />
          </label>
        )}
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex-1 truncate text-sm font-semibold">{name}</span>
        <span className="text-[0.7rem] text-tertiary">{(size / 1_048_576).toFixed(2)} MB</span>
        <button onClick={onRemove} className="flex h-7 w-7 items-center justify-center rounded bg-surface-sunken text-xs text-tertiary transition-colors hover:bg-[oklch(90%_0.04_25)] hover:text-[oklch(45%_0.12_25)]" aria-label={`Remove ${name}`}>✕</button>
      </div>
    </div>
  );
}
