import { useState, useRef, useEffect, useCallback } from "react";
import { useI18n } from "@/context/I18nContext";
import type { WpTag } from "@/hooks/useWpTags";

interface TagFilterProps {
  tags: WpTag[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  onClear: () => void;
}

export function TagFilter({ tags, selectedIds, onToggle, onClear }: TagFilterProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    // Return focus to trigger so keyboard users don't lose context
    triggerRef.current?.focus();
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, close]);

  if (tags.length === 0) return null;

  const triggerLabel =
    selectedIds.length === 0
      ? t("tag_filter_placeholder" as Parameters<typeof t>[0])
      : t("tag_filter_selected" as Parameters<typeof t>[0], { n: selectedIds.length });

  return (
    <div className="relative mb-4" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t("tag_filter_label" as Parameters<typeof t>[0])}
        className="inline-flex items-center gap-1.5 rounded-md border border-border-default bg-surface-raised px-3 py-1.5 text-sm transition-colors hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent-subtle focus:outline-none"
      >
        <span>{triggerLabel}</span>
        <svg
          className={`h-3.5 w-3.5 text-tertiary transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          role="group"
          aria-label={t("tag_filter_label" as Parameters<typeof t>[0])}
          className="absolute left-0 z-20 mt-1 max-h-60 w-56 overflow-y-auto rounded-md border border-border-default bg-surface-raised py-1 shadow-lg"
        >
          {tags.map((tag) => {
            const isSelected = selectedIds.includes(tag.id);
            return (
              <label
                key={tag.id}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-surface-sunken"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(tag.id)}
                  className="h-3.5 w-3.5 rounded border-border-default text-accent accent-accent"
                />
                <span className="flex-1 truncate">{tag.name}</span>
                {tag.count != null && (
                  <span className="text-xs text-tertiary">{tag.count}</span>
                )}
              </label>
            );
          })}
          {selectedIds.length > 0 && (
            <>
              <hr className="my-1 border-border-subtle" />
              <button
                type="button"
                onClick={() => {
                  onClear();
                  close();
                }}
                className="w-full px-3 py-1.5 text-left text-xs font-medium text-tertiary transition-colors hover:text-secondary"
              >
                ✕ {t("tag_filter_clear" as Parameters<typeof t>[0])}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
