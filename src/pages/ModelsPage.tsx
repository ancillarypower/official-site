import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useI18n } from "@/context/I18nContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ModelUpload } from "@/components/models/ModelUpload";
import { ModelCard } from "@/components/models/ModelCard";
import { StorageQuotaBar } from "@/components/models/StorageQuotaBar";
import { MAX_BATCH_FILES } from "@/lib/constants";
import { saveModel, getAllModelMeta, deleteModel, deleteMultipleModels, deleteAllModels, renameModel } from "@/hooks/useModelDB";
import { computeFileHash } from "@/lib/hash";
import type { ModelMeta } from "@/lib/types";

interface LoadedModelMeta extends ModelMeta { id: number; }

type ModelSortKey =
  | "custom"
  | "name_asc" | "name_desc"
  | "size_asc" | "size_desc"
  | "ext_asc" | "ext_desc"
  | "date_asc" | "date_desc"
  | "updated_asc" | "updated_desc";

const SORT_ORDER_KEY = "model_sort_order";
const SORT_KEY_STORAGE = "model_sort_key";

const VALID_SORT_KEYS: readonly string[] = [
  "custom", "name_asc", "name_desc", "size_asc", "size_desc",
  "ext_asc", "ext_desc", "date_asc", "date_desc",
  "updated_asc", "updated_desc",
];

function getStoredSortKey(): ModelSortKey {
  try {
    const raw = localStorage.getItem(SORT_KEY_STORAGE);
    if (raw && VALID_SORT_KEYS.includes(raw)) return raw as ModelSortKey;
  } catch { /* localStorage unavailable */ }
  return "custom";
}

function persistSortKey(key: ModelSortKey): void {
  try {
    if (key === "custom") localStorage.removeItem(SORT_KEY_STORAGE);
    else localStorage.setItem(SORT_KEY_STORAGE, key);
  } catch { /* localStorage unavailable */ }
}

function sortModels(models: LoadedModelMeta[], key: ModelSortKey): LoadedModelMeta[] {
  if (key === "custom") return models;
  const sorted = [...models];
  sorted.sort((a, b) => {
    switch (key) {
      case "name_asc": return a.name.localeCompare(b.name);
      case "name_desc": return b.name.localeCompare(a.name);
      case "size_asc": return a.size - b.size;
      case "size_desc": return b.size - a.size;
      case "ext_asc": return a.ext.localeCompare(b.ext);
      case "ext_desc": return b.ext.localeCompare(a.ext);
      case "date_asc": return a.timestamp - b.timestamp;
      case "date_desc": return b.timestamp - a.timestamp;
      case "updated_asc": return (a.updatedAt ?? a.timestamp) - (b.updatedAt ?? b.timestamp);
      case "updated_desc": return (b.updatedAt ?? b.timestamp) - (a.updatedAt ?? a.timestamp);
      default: return 0;
    }
  });
  return sorted;
}

function applyStoredOrder(models: LoadedModelMeta[]): LoadedModelMeta[] {
  try {
    const raw = localStorage.getItem(SORT_ORDER_KEY);
    if (!raw) return models;
    const order: number[] = JSON.parse(raw);
    const map = new Map(models.map((m) => [m.id, m]));
    const sorted: LoadedModelMeta[] = [];
    for (const id of order) {
      const m = map.get(id);
      if (m) { sorted.push(m); map.delete(id); }
    }
    for (const m of map.values()) sorted.push(m);
    return sorted;
  } catch {
    return models;
  }
}

function persistOrder(models: LoadedModelMeta[]): void {
  try {
    localStorage.setItem(SORT_ORDER_KEY, JSON.stringify(models.map((m) => m.id)));
  } catch { /* localStorage unavailable */ }
}

export default function ModelsPage() {
  const { t } = useI18n();
  useDocumentTitle(t("nav_models"));
  const [models, setModels] = useState<LoadedModelMeta[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [dragTargetId, setDragTargetId] = useState<number | null>(null);
  const [sortKey, setSortKeyState] = useState<ModelSortKey>(getStoredSortKey);
  const dragSourceRef = useRef<number | null>(null);
  const dragTargetRef = useRef<number | null>(null);

  // Ref to hold latest t so the mount-only useEffect can show
  // the current translation without re-triggering (Issue #289).
  const tRef = useRef(t);
  tRef.current = t;

  const isCustomSort = sortKey === "custom";
  const allExpanded = models.length > 0 && expandedIds.size === models.length;

  const setSortKey = useCallback((key: ModelSortKey) => {
    setSortKeyState(key);
    persistSortKey(key);
    setModels((prev) => {
      if (key === "custom") return applyStoredOrder(prev);
      return sortModels(prev, key);
    });
  }, []);

  useEffect(() => {
    getAllModelMeta()
      .then((records) => {
        const loaded = records.filter((r): r is LoadedModelMeta => r.id != null);
        const initialKey = getStoredSortKey();
        if (initialKey === "custom") {
          setModels(applyStoredOrder(loaded));
        } else {
          setModels(sortModels(loaded, initialKey));
        }
      })
      .catch((err) => {
        console.warn("[ModelsPage] IndexedDB unavailable:", err);
        toast.error(tRef.current("models_db_error"));
      });
  }, []);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    // Guard: cap batch size to prevent UI freezes and IndexedDB quota
    // exhaustion when users drop hundreds of small files (Issue #301).
    if (files.length > MAX_BATCH_FILES) {
      toast.warning(t("models_batch_limit", { n: MAX_BATCH_FILES }));
      files = files.slice(0, MAX_BATCH_FILES);
    }

    setIsUploading(true);
    try {
      // Read current models from IndexedDB (canonical source of truth)
      // instead of React state to avoid stale closure issues
      const dbRecords = await getAllModelMeta();
      let currentModels = dbRecords.filter((r): r is LoadedModelMeta => r.id != null);

      for (const file of files) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

        // Read file data first, before any state mutations
        let ab: ArrayBuffer;
        try {
          ab = await file.arrayBuffer();
        } catch (err) {
          console.error("Failed to read file:", file.name, err);
          toast.error(t("models_upload_error", { name: file.name }));
          continue;
        }
        if (ab.byteLength === 0) continue;

        // Compute SHA-256 content hash for deduplication
        const fileHash = await computeFileHash(ab);

        // Check for duplicate content (hash match) before filename match
        const hashDupe = currentModels.find((m) => m.hash && m.hash === fileHash);
        if (hashDupe) {
          toast.warning(t("models_duplicate_hash", { name: hashDupe.name }));
          continue;
        }

        // Check for duplicate filename
        const existing = currentModels.find((m) => m.name === file.name);
        if (existing) {
          if (!window.confirm(t("models_replace_confirm", { name: file.name }))) continue;
          try {
            await deleteModel(existing.id);
            currentModels = currentModels.filter((m) => m.id !== existing.id);
            setModels((prev) => {
              const updated = prev.filter((m) => m.id !== existing.id);
              if (getStoredSortKey() === "custom") persistOrder(updated);
              return updated;
            });
            setSelectedIds((prev) => { const next = new Set(prev); next.delete(existing.id); return next; });
            setExpandedIds((prev) => { const next = new Set(prev); next.delete(existing.id); return next; });
          } catch (err) {
            console.error("Failed to delete existing model:", existing.id, err);
            toast.error(t("models_delete_failed"));
            continue;
          }
        }

        // Save the new model with content hash
        try {
          const id = await saveModel(file.name, file.size, ext, ab, fileHash);
          const newModel: LoadedModelMeta = { id, name: file.name, size: file.size, ext, timestamp: Date.now(), hash: fileHash };
          currentModels = [...currentModels, newModel];
          setModels((prev) => {
            const updated = [...prev, newModel];
            const currentKey = getStoredSortKey();
            if (currentKey === "custom") {
              persistOrder(updated);
              return updated;
            }
            return sortModels(updated, currentKey);
          });
        } catch (err) {
          console.error("Failed to save model:", file.name, err);
          toast.error(t("models_upload_error", { name: file.name }));
        }
      }
    } finally {
      setIsUploading(false);
    }
  }, [t]);

  const handleRemove = useCallback(async (id: number, name: string) => {
    const confirmed = window.confirm(t("models_delete_confirm", { name }));
    if (!confirmed) return;
    setDeletingIds((prev) => { const next = new Set(prev); next.add(id); return next; });
    try {
      await deleteModel(id);
      setModels((prev) => {
        const updated = prev.filter((m) => m.id !== id);
        if (getStoredSortKey() === "custom") persistOrder(updated);
        return updated;
      });
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      setExpandedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    } catch (err) {
      console.error("Failed to delete model:", id, err);
      toast.error(t("models_delete_failed"));
    } finally {
      setDeletingIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  }, [t]);

  const handleRename = useCallback(async (id: number, newName: string) => {
    try {
      await renameModel(id, newName);
      setModels((prev) => {
        const updated = prev.map((m) => m.id === id ? { ...m, name: newName, updatedAt: Date.now() } : m);
        const currentKey = getStoredSortKey();
        if (currentKey !== "custom") return sortModels(updated, currentKey);
        return updated;
      });
    } catch (err) {
      console.error("Failed to rename model:", id, err);
      toast.error(t("models_rename_failed"));
    }
  }, [t]);

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

  const handleToggleExpand = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleToggleAllExpand = useCallback(() => {
    setExpandedIds((prev) => {
      if (prev.size === models.length && models.length > 0) return new Set();
      return new Set(models.map((m) => m.id));
    });
  }, [models]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(t("models_delete_selected_confirm", { n: selectedIds.size }));
    if (!confirmed) return;
    const ids = [...selectedIds];
    setIsBulkDeleting(true);
    try {
      await deleteMultipleModels(ids);
      setModels((prev) => {
        const updated = prev.filter((m) => !selectedIds.has(m.id));
        if (getStoredSortKey() === "custom") persistOrder(updated);
        return updated;
      });
      setSelectedIds(new Set());
      setExpandedIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
    } catch (err) {
      console.error("Failed to delete selected models:", ids, err);
      toast.error(t("models_delete_failed"));
    } finally {
      setIsBulkDeleting(false);
    }
  }, [selectedIds, t]);

  const handleDeleteAll = useCallback(async () => {
    if (models.length === 0) return;
    const confirmed = window.confirm(t("models_delete_all_confirm", { n: models.length }));
    if (!confirmed) return;
    setIsBulkDeleting(true);
    try {
      await deleteAllModels();
      setModels([]);
      setSelectedIds(new Set());
      setExpandedIds(new Set());
      persistOrder([]);
    } catch (err) {
      console.error("Failed to delete all models:", err);
      toast.error(t("models_delete_failed"));
    } finally {
      setIsBulkDeleting(false);
    }
  }, [models.length, t]);

  const handleDragStart = useCallback((id: number) => {
    dragSourceRef.current = id;
  }, []);

  const handleDragEnter = useCallback((id: number) => {
    if (dragSourceRef.current !== null && dragSourceRef.current !== id) {
      dragTargetRef.current = id;
      setDragTargetId(id);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragEnd = useCallback(() => {
    const sourceId = dragSourceRef.current;
    const targetId = dragTargetRef.current;
    dragSourceRef.current = null;
    dragTargetRef.current = null;
    setDragTargetId(null);

    if (sourceId == null || targetId == null || sourceId === targetId) return;

    setModels((prev) => {
      const arr = [...prev];
      const srcIdx = arr.findIndex((m) => m.id === sourceId);
      const tgtIdx = arr.findIndex((m) => m.id === targetId);
      if (srcIdx === -1 || tgtIdx === -1) return prev;
      const removed = arr.splice(srcIdx, 1);
      const moved = removed[0];
      if (!moved) return prev;
      arr.splice(tgtIdx, 0, moved);
      persistOrder(arr);
      return arr;
    });
  }, []);

  // No-op handlers for when drag is disabled
  const noop = useCallback(() => {}, []);
  const noopDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); }, []);

  const allSelected = models.length > 0 && selectedIds.size === models.length;

  return (
    <div>
      <div className="mb-4 flex items-baseline gap-3 border-b border-border-subtle pb-4">
        <h2 className="text-lg font-bold">{t("models_title")}</h2>
        <span className="text-xs text-tertiary">{t("models_loaded", { n: models.length })}</span>
      </div>
      <ModelUpload onFilesSelected={handleFilesSelected} disabled={isUploading} />
      {models.length > 0 && (
        <>
          <div className="mt-2 rounded-md bg-surface-sunken px-3 py-1.5 text-center text-[0.7rem] text-tertiary">
            💾 {t("models_persisted")}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={handleSelectAll}
              disabled={isBulkDeleting}
              className={`rounded-md border border-border-subtle bg-surface-raised px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-sunken ${isBulkDeleting ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {allSelected ? t("models_deselect_all") : t("models_select_all")}
            </button>
            <button
              onClick={handleToggleAllExpand}
              disabled={isBulkDeleting}
              className={`rounded-md border border-border-subtle bg-surface-raised px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-sunken ${isBulkDeleting ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {allExpanded ? t("models_collapse_all") : t("models_expand_all")}
            </button>
            <label className="flex items-center gap-1 text-xs font-medium text-secondary">
              {t("models_sort_label")}
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as ModelSortKey)}
                disabled={isBulkDeleting}
                className={`rounded-md border border-border-subtle bg-surface-raised px-2 py-1.5 text-xs transition-colors hover:bg-surface-sunken ${isBulkDeleting ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <option value="custom">{t("models_sort_custom")}</option>
                <option value="name_asc">{t("models_sort_name_asc")}</option>
                <option value="name_desc">{t("models_sort_name_desc")}</option>
                <option value="size_asc">{t("models_sort_size_asc")}</option>
                <option value="size_desc">{t("models_sort_size_desc")}</option>
                <option value="ext_asc">{t("models_sort_ext_asc")}</option>
                <option value="ext_desc">{t("models_sort_ext_desc")}</option>
                <option value="date_desc">{t("models_sort_date_desc")}</option>
                <option value="date_asc">{t("models_sort_date_asc")}</option>
                <option value="updated_desc">{t("models_sort_updated_desc")}</option>
                <option value="updated_asc">{t("models_sort_updated_asc")}</option>
              </select>
            </label>
            {selectedIds.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={isBulkDeleting}
                className={`rounded-md bg-[oklch(55%_0.15_25)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[oklch(45%_0.15_25)] ${isBulkDeleting ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {t("models_delete_selected", { n: selectedIds.size })}
              </button>
            )}
            <button
              onClick={handleDeleteAll}
              disabled={isBulkDeleting}
              className={`ml-auto rounded-md border border-[oklch(70%_0.1_25)] px-3 py-1.5 text-xs font-medium text-[oklch(55%_0.15_25)] transition-colors hover:bg-[oklch(90%_0.04_25)] ${isBulkDeleting ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              🗑 {t("models_delete_all")}
            </button>
          </div>
          {isCustomSort && (
            <div className="mt-1 text-center text-[0.65rem] text-tertiary">
              {t("models_drag_hint")}
            </div>
          )}
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
            onRemove={() => handleRemove(model.id, model.name)}
            isDeleting={deletingIds.has(model.id) || isBulkDeleting}
            onDragStart={isCustomSort ? () => handleDragStart(model.id) : noop}
            onDragEnter={isCustomSort ? () => handleDragEnter(model.id) : noop}
            onDragOver={isCustomSort ? handleDragOver : noopDragOver}
            onDragEnd={isCustomSort ? handleDragEnd : noop}
            isDragTarget={isCustomSort && dragTargetId === model.id}
            onRename={(newName) => handleRename(model.id, newName)}
            expanded={expandedIds.has(model.id)}
            onToggleExpand={() => handleToggleExpand(model.id)}
          />
        ))}
      </div>
      <StorageQuotaBar />
    </div>
  );
}
