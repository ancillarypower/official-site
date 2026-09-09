import { useI18n } from "@/context/I18nContext";

interface ContentToolbarProps {
  filterValue: string;
  onFilterChange: (value: string) => void;
  sortValue: string;
  onSortChange: (value: string) => void;
  sortOptions: { value: string; labelKey: string }[];
  filterPlaceholderKey?: string;
}

export function ContentToolbar({ filterValue, onFilterChange, sortValue, onSortChange, sortOptions, filterPlaceholderKey = "filter_placeholder" }: ContentToolbarProps) {
  const { t } = useI18n();

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2.5">
      <input type="text" value={filterValue} onChange={(e) => onFilterChange(e.target.value)} placeholder={t(filterPlaceholderKey as Parameters<typeof t>[0])} className="min-w-[180px] rounded-md border border-border-default bg-surface-raised px-3 py-1.5 text-sm transition-colors focus:border-accent focus:ring-2 focus:ring-accent-subtle focus:outline-none" aria-label="Filter" />
      <span className="text-[0.725rem] font-medium text-tertiary">{t("sort_label")}</span>
      <select value={sortValue} onChange={(e) => onSortChange(e.target.value)} className="rounded-md border border-border-default bg-surface-raised px-3 py-1.5 text-sm" aria-label="Sort by">
        {sortOptions.map((opt) => (<option key={opt.value} value={opt.value}>{t(opt.labelKey as Parameters<typeof t>[0])}</option>))}
      </select>
    </div>
  );
}
