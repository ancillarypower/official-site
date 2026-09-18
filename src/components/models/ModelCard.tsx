import { useState } from "react";
import { useI18n } from "@/context/I18nContext";
import { ModelViewer } from "./ModelViewer";

interface ModelCardProps {
  name: string;
  size: number;
  ext: string;
  modelId: number;
  selected?: boolean;
  onToggleSelect?: () => void;
  onRemove: () => void;
  isDeleting?: boolean;
  onDragStart?: () => void;
  onDragEnter?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  isDragTarget?: boolean;
}

export function ModelCard({ name, size, ext, modelId, selected = false, onToggleSelect, onRemove, isDeleting = false, onDragStart, onDragEnter, onDragOver, onDragEnd, isDragTarget = false }: ModelCardProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`animate-fade-in overflow-hidden rounded-xl border bg-surface-raised transition-colors cursor-grab active:cursor-grabbing ${
        isDragTarget ? "ring-2 ring-accent border-accent" : selected ? "border-accent ring-2 ring-accent/30" : "border-border-subtle"
      }`}
    >
      <div className="relative">
        {expanded ? (
          <>
            <ModelViewer name={name} ext={ext} modelId={modelId} />
            <button
              onClick={() => setExpanded(false)}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded bg-surface-raised/80 text-xs text-tertiary backdrop-blur-sm transition-colors hover:bg-surface-sunken"
              aria-label={t("models_collapse_3d")}
              title={t("models_collapse_3d")}
            >
              \u2715
            </button>
          </>
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-[oklch(14%_0.008_250)]">
            <span className="rounded bg-surface-raised/60 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-tertiary">
              {ext.toUpperCase()}
            </span>
            <button
              onClick={() => setExpanded(true)}
              className="rounded-md bg-accent/80 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent"
              title={t("models_view_3d")}
            >
              {t("models_view_3d")}
            </button>
          </div>
        )}
        {onToggleSelect && (
          <label className="absolute left-2 top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded bg-surface-raised/80 backdrop-blur-sm" title={t("models_select_label", { name })}>
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              className="h-4 w-4 accent-accent"
              aria-label={t("models_select_label", { name })}
            />
          </label>
        )}
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex-1 truncate text-sm font-semibold">{name}</span>
        <span className="text-[0.7rem] text-tertiary">{(size / 1_048_576).toFixed(2)} MB</span>
        <button onClick={onRemove} disabled={isDeleting} className={`flex h-7 w-7 items-center justify-center rounded bg-surface-sunken text-xs text-tertiary transition-colors hover:bg-[oklch(90%_0.04_25)] hover:text-[oklch(45%_0.12_25)] ${isDeleting ? "opacity-50 cursor-not-allowed" : ""}`} aria-label={t("models_remove_label", { name })} title={t("models_remove_label", { name })}>{isDeleting ? "\u23F3" : "\u2715"}</button>
      </div>
    </div>
  );
}
