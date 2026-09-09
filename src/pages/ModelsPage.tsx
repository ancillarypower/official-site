import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/context/I18nContext";
import { ModelUpload } from "@/components/models/ModelUpload";
import { ModelCard } from "@/components/models/ModelCard";
import { StorageQuotaBar } from "@/components/models/StorageQuotaBar";
import { saveModel, getAllModels, deleteModel } from "@/hooks/useModelDB";
import type { ModelRecord } from "@/lib/types";

interface LoadedModel extends ModelRecord { id: number; }

export default function ModelsPage() {
  const { t } = useI18n();
  const [models, setModels] = useState<LoadedModel[]>([]);

  useEffect(() => { getAllModels().then((records) => { setModels(records.filter((r): r is LoadedModel => r.id != null)); }); }, []);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      try { const ab = await file.arrayBuffer(); if (ab.byteLength === 0) continue; const id = await saveModel(file.name, file.size, ext, ab); setModels((prev) => [...prev, { id, name: file.name, size: file.size, ext, data: ab, timestamp: Date.now() }]); } catch (err) { console.error("Failed to process:", file.name, err); }
    }
  }, []);

  const handleRemove = useCallback(async (id: number) => { await deleteModel(id); setModels((prev) => prev.filter((m) => m.id !== id)); }, []);

  return (
    <div>
      <div className="mb-4 flex items-baseline gap-3 border-b border-border-subtle pb-4">
        <h2 className="text-lg font-bold">{t("models_title")}</h2>
        <span className="text-xs text-tertiary">{t("models_loaded", { n: models.length })}</span>
      </div>
      <ModelUpload onFilesSelected={handleFilesSelected} />
      <StorageQuotaBar />
      {models.length > 0 && <div className="mt-2 rounded-md bg-surface-sunken px-3 py-1.5 text-center text-[0.7rem] text-tertiary">💾 {t("models_persisted")}</div>}
      <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(360px,1fr))] gap-5">
        {models.map((model) => <ModelCard key={model.id} name={model.name} size={model.size} ext={model.ext} data={model.data} onRemove={() => handleRemove(model.id)} />)}
      </div>
    </div>
  );
}
