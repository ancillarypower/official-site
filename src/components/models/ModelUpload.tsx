import { useCallback, useRef, useState, type DragEvent } from "react";
import { useI18n } from "@/context/I18nContext";
import { MODEL_EXTENSIONS } from "@/lib/constants";

interface ModelUploadProps { onFilesSelected: (files: File[]) => void; }

export function ModelUpload({ onFilesSelected }: ModelUploadProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragover, setDragover] = useState(false);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const valid = [...fileList].filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      return ext && MODEL_EXTENSIONS.includes(ext as (typeof MODEL_EXTENSIONS)[number]);
    });
    if (valid.length > 0) onFilesSelected(valid);
  }, [onFilesSelected]);

  const onDrop = useCallback((e: DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragover(false); handleFiles(e.dataTransfer.files); }, [handleFiles]);

  return (
    <div className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${dragover ? "border-accent bg-accent-subtle" : "border-border-default hover:border-accent hover:bg-accent-subtle"}`} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragover(true); }} onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragover(false); }} onDrop={onDrop} onClick={() => inputRef.current?.click()} role="button" tabIndex={0} aria-label={t("models_drop")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}>
      <input ref={inputRef} type="file" multiple accept=".glb,.gltf,.obj,.stl" className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
      <div className="pointer-events-none text-3xl">📦</div>
      <div className="pointer-events-none mt-3 text-sm font-semibold">{t("models_drop")}</div>
      <div className="pointer-events-none mt-1 text-xs text-tertiary">{t("models_formats")}</div>
    </div>
  );
}
