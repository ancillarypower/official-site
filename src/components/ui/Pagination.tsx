import { useI18n } from "@/context/I18nContext";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const { t } = useI18n();
  if (totalPages <= 1) return null;

  return (
    <div className="mt-8 flex items-center gap-2">
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1} className="rounded-md border border-border-default bg-surface-raised px-3.5 py-2 text-xs font-medium text-secondary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40">{t("prev")}</button>
      <span className="px-2 text-[0.725rem] tabular-nums text-tertiary">{currentPage}/{totalPages}</span>
      <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages} className="rounded-md border border-border-default bg-surface-raised px-3.5 py-2 text-xs font-medium text-secondary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40">{t("next")}</button>
    </div>
  );
}
