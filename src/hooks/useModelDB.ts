import { openDB, type IDBPDatabase } from "idb";
import type { ModelRecord } from "@/lib/types";

const DB_NAME = "wp_renderer_models";
const DB_VERSION = 1;
const STORE_NAME = "models";

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    },
  });
}

export async function saveModel(name: string, size: number, ext: string, data: ArrayBuffer): Promise<number> {
  const db = await getDB();
  const id = await db.add(STORE_NAME, { name, size, ext, data, timestamp: Date.now() });
  return id as number;
}

export async function getAllModels(): Promise<ModelRecord[]> {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

export async function deleteModel(id: number): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export async function deleteMultipleModels(ids: number[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  await Promise.all(ids.map((id) => tx.store.delete(id)));
  await tx.done;
}

export async function deleteAllModels(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
}
