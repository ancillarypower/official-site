import { openDB, type IDBPDatabase } from "idb";
import type { ModelRecord, ModelMeta } from "@/lib/types";

const DB_NAME = "wp_renderer_models";
const DB_VERSION = 1;
const STORE_NAME = "models";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Reset the cached DB promise. For test isolation only.
 * @internal
 */
export function _resetDB(): void {
  dbPromise = null;
}

export async function saveModel(name: string, size: number, ext: string, data: ArrayBuffer, hash?: string): Promise<number> {
  const db = await getDB();
  const id = await db.add(STORE_NAME, { name, size, ext, data, timestamp: Date.now(), ...(hash != null && { hash }) });
  return id as number;
}

export async function getAllModels(): Promise<ModelRecord[]> {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

/**
 * Retrieve metadata for all stored models without retaining ArrayBuffer
 * references in the returned array. IndexedDB always loads the full record
 * (including data), but we strip it immediately so the caller's state does
 * not keep the heavy payload alive in memory.
 */
export async function getAllModelMeta(): Promise<ModelMeta[]> {
  const db = await getDB();
  const all = await db.getAll(STORE_NAME);
  return all.map(({ id, name, size, ext, timestamp, hash, updatedAt }) => ({
    id, name, size, ext, timestamp,
    ...(hash != null && { hash }),
    ...(updatedAt != null && { updatedAt }),
  }));
}

/**
 * Read a single model's ArrayBuffer on demand.
 * Returns null when the id does not exist.
 */
export async function getModelData(id: number): Promise<ArrayBuffer | null> {
  const db = await getDB();
  const record = await db.get(STORE_NAME, id);
  return record?.data ?? null;
}

export async function deleteModel(id: number): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export async function deleteMultipleModels(ids: number[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  await Promise.all([...ids.map((id) => tx.store.delete(id)), tx.done]);
}

export async function deleteAllModels(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
}

export async function renameModel(id: number, newName: string): Promise<void> {
  const db = await getDB();
  const record = await db.get(STORE_NAME, id);
  if (!record) throw new Error(`Model ${id} not found`);
  record.name = newName;
  record.updatedAt = Date.now();
  await db.put(STORE_NAME, record);
}
