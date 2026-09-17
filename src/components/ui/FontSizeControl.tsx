import { useSettingsStore } from "@/stores/settingsStore";
import { useI18n } from "@/context/I18nContext";

export function FontSizeControl() {
  const fontScale = useSettingsStore((s) => s.fontScale);
  const setFontScale = useSettingsStore((s) => s.setFontScale);
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-1.5 rounded-md bg-surface-sunken px-2 py-1">
      <button
        onClick={() => setFontScale(fontScale - 0.1)}
        className="flex h-6 w-6 items-center justify-center rounded bg-surface-raised text-xs font-bold text-secondary transition-colors hover:bg-accent-subtle hover:text-accent"
        aria-label={t("a11y_decrease_font")}
        title={t("a11y_decrease_font")}
      >
        A−
      </button>
      <input
        type="range"
        min="0.7"
        max="1.5"
        step="0.05"
        value={fontScale}
        onChange={(e) => setFontScale(parseFloat(e.target.value))}
        className="h-1 w-15 cursor-pointer appearance-none rounded-full bg-border-default accent-accent"
        aria-label={t("a11y_font_size")}
      />
      <button
        onClick={() => setFontScale(fontScale + 0.1)}
        className="flex h-6 w-6 items-center justify-center rounded bg-surface-raised text-xs font-bold text-secondary transition-colors hover:bg-accent-subtle hover:text-accent"
        aria-label={t("a11y_increase_font")}
        title={t("a11y_increase_font")}
      >
        A+
      </button>
      <span className="min-w-7 text-center text-[0.65rem] tabular-nums text-tertiary">
        {Math.round(fontScale * 100)}%
      </span>
      <button
        onClick={() => setFontScale(1)}
        className={`flex h-6 w-6 items-center justify-center rounded bg-surface-raised text-xs font-bold text-secondary transition-colors hover:bg-accent-subtle hover:text-accent${fontScale === 1 ? " opacity-30 cursor-default" : ""}`}
        aria-label={t("a11y_reset_font")}
        title={t("a11y_reset_font")}
      >
        ↺
      </button>
    </div>
  );
}
