interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3.5 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-sunken text-xl">
        {icon}
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
      {description && (
        <p className="max-w-[300px] text-sm text-tertiary">{description}</p>
      )}
    </div>
  );
}
