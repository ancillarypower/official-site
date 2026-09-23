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

  if (tags.length === 0) return null;

  return (
    <div
      className="mb-4"
      role="group"
      aria-label={t("tag_filter_label" as Parameters<typeof t>[0])}
    >
      <div className="flex flex-wrap items-center gap-2">
        {tags.map((tag) => {
          const isSelected = selectedIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onToggle(tag.id)}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                isSelected
                  ? "bg-accent text-white"
                  : "bg-surface-sunken text-secondary hover:bg-surface-raised"
              }`}
              aria-pressed={isSelected}
            >
              {tag.name}
              {tag.count != null && (
                <span
                  className={`text-[0.65rem] ${
                    isSelected ? "text-white/70" : "text-tertiary"
                  }`}
                >
                  {tag.count}
                </span>
              )}
            </button>
          );
        })}
        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-full px-3 py-1 text-xs font-medium text-tertiary hover:text-secondary transition-colors"
          >
            ✕ {t("tag_filter_clear" as Parameters<typeof t>[0])}
          </button>
        )}
      </div>
    </div>
  );
}
