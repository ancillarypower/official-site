import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useI18n } from "@/context/I18nContext";
import { ModelUpload } from "@/components/models/ModelUpload";
import { ModelCard } from "@/components/models/ModelCard";
import { StorageQuotaBar } from "@/components/models/StorageQuotaBar";
import { saveModel, getAllModelMeta, deleteModel, deleteMultipleModels, deleteAllModels } from "@/hooks/useModelDB";
import type { ModelMeta } from "@/lib/types";

interface LoadedModelMeta extends ModelMeta { id: number; }

export default function ModelsPage() {
  const { t } = useI18n();
  const [models, setModels] = useState<LoadedModelMeta[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    getAllModelMeta()
      .then((records) => {
        setModels(records.filter((r): r is LoadedModelMeta => r.id != null));
      })
      .catch((err) => {
        console.warn("[ModelsPage] IndexedDB unavailable:", err);
        toast.error(t("models_db_error"));
      });
  }, [t]);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      try {
        const ab = await file.arrayBuffer();
        if (ab.byteLength === 0) continue;
        const id = await saveModel(file.name, file.size, ext, ab);
        setModels((prev) => [...prev, { id, name: file.name, size: file.size, ext, timestamp: Date.now() }]);
      } catch (err) {
        console.error("Failed to process:", file.name, err);
        toast.error(t("models_upload_error", { name: file.name }));
      }
    }
  }, [t]);

  const handleRemove = useCallback(async (id: number) => {
    await deleteModel(id);
    setModels((prev) => prev.filter((m) => m.id !== id));
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }, []);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === models.length) return new Set();
      return new Set(models.map((m) => m.id));
    });
  }, [models]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(t("models_delete_selected_confirm", { n: selectedIds.size }));
    if (!confirmed) return;
    const ids = [...selectedIds];
    await deleteMultipleModels(ids);
    setModels((prev) => prev.filter((m) => !selectedIds.has(m.id)));
    setSelectedIds(new Set());
  }, [selectedIds, t]);

  const handleDeleteAll = useCallback(async () => {
    if (models.length === 0) return;
    const confirmed = window.confirm(t("models_delete_all_confirm", { n: models.length }));
    if (!confirmed) return;
    await deleteAllModels();
    setModels([]);
    setSelectedIds(new Set());
  }, [models.length, t]);

  const allSelected = models.length > 0 && selectedIds.size === models.length;

  return (
    <div>
      <div className="mb-4 flex items-baseline gap-3 border-b border-border-subtle pb-4">
        <h2 className="text-lg font-bold">{t("models_title")}</h2>
        <span className="text-xs text-tertiary">{t("models_loaded", { n: models.length })}</span>
      </div>
      <ModelUpload onFilesSelected={handleFilesSelected} />
      <StorageQuotaBar />
      {models.length > 0 && (
        <>
          <div className="mt-2 rounded-md bg-surface-sunken px-3 py-1.5 text-center text-[0.7rem] text-tertiary">
            \uD83D\uDCBE {t("models_persisted")}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="rounded-md border border-border-subtle bg-surface-raised px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-sunken"
            >
              {allSelected ? t("models_deselect_all") : t("models_select_all")}
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="rounded-md bg-[oklch(55%_0.15_25)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[oklch(45%_0.15_25)]"
              >
                {t("models_delete_selected", { n: selectedIds.size })}
              </button>
            )}
            <button
              onClick={handleDeleteAll}
              className="ml-auto rounded-md border border-[oklch(70%_0.1_25)] px-3 py-1.5 text-xs font-medium text-[oklch(55%_0.15_25)] transition-colors hover:bg-[oklch(90%_0.04_25)]"
            >
              \uD83D\uDDD1 {t("models_delete_all")}
            </button>
          </div>
        </>
      )}
      <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(360px,1fr))] gap-5">
        {models.map((model) => (
          <ModelCard
            key={model.id}
            name={model.name}
            size={model.size}
            ext={model.ext}
            modelId={model.id}
            selected={selectedIds.has(model.id)}
            onToggleSelect={() => toggleSelect(model.id)}
            onRemove={() => handleRemove(model.id)}
          />
        ))}
      </div>
    </div>
  );
}
