import { useCallback, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { useI18n } from "@/context/I18nContext";
import { MODEL_EXTENSIONS, MAX_MODEL_SIZE } from "@/lib/constants";

interface ModelUploadProps { onFilesSelected: (files: File[]) => void; disabled?: boolean; }

export function ModelUpload({ onFilesSelected, disabled = false }: ModelUploadProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragover, setDragover] = useState(false);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList || disabled) return;
    const valid = [...fileList].filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      if (!ext || !MODEL_EXTENSIONS.includes(ext as (typeof MODEL_EXTENSIONS)[number])) return false;
      if (f.size > MAX_MODEL_SIZE) {
        toast.error(t("models_file_too_large", { name: f.name, limit: MAX_MODEL_SIZE / 1024 / 1024 }));
        return false;
      }
      return true;
    });
    if (valid.length > 0) onFilesSelected(valid);
  }, [onFilesSelected, t, disabled]);

  const onDrop = useCallback((e: DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragover(false); if (!disabled) handleFiles(e.dataTransfer.files); }, [handleFiles, disabled]);

  return (
    <div className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${disabled ? "opacity-50 cursor-not-allowed border-border-default" : dragover ? "border-accent bg-accent-subtle" : "border-border-default hover:border-accent hover:bg-accent-subtle"}`} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (!disabled) setDragover(true); }} onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragover(false); }} onDrop={onDrop} onClick={() => { if (!disabled) inputRef.current?.click(); }} role="button" tabIndex={0} aria-label={disabled ? t("models_uploading") : t("models_drop")} aria-disabled={disabled} onKeyDown={(e) => { if (disabled) return; if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}>
      <input ref={inputRef} type="file" multiple accept=".glb,.gltf,.obj,.stl,.ifc" className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} disabled={disabled} />
      <div className="pointer-events-none text-3xl">{disabled ? "⏳" : "📦"}</div>
      <div className="pointer-events-none mt-3 text-sm font-semibold">{disabled ? t("models_uploading") : t("models_drop")}</div>
      {!disabled && <div className="pointer-events-none mt-1 text-xs text-tertiary">{t("models_formats")}</div>}
    </div>
  );
}
