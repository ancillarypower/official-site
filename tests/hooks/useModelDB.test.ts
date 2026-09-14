import { describe, it, expect, beforeEach } from "vitest";
import {
  saveModel,
  getAllModels,
  getAllModelMeta,
  getModelData,
  deleteModel,
  deleteMultipleModels,
  deleteAllModels,
} from "@/hooks/useModelDB";

describe("useModelDB", () => {
  beforeEach(async () => {
    const models = await getAllModels();
    for (const m of models) {
      if (m.id != null) await deleteModel(m.id);
    }
  });

  it("saves and retrieves a model", async () => {
    const id = await saveModel("test.glb", 16, "glb", new ArrayBuffer(16));
    expect(id).toBeGreaterThan(0);
    const models = await getAllModels();
    expect(models).toHaveLength(1);
    expect(models[0]?.name).toBe("test.glb");
    expect(models[0]?.size).toBe(16);
    expect(models[0]?.ext).toBe("glb");
  });

  it("saves multiple models", async () => {
    await saveModel("a.obj", 100, "obj", new ArrayBuffer(100));
    await saveModel("b.stl", 200, "stl", new ArrayBuffer(200));
    expect(await getAllModels()).toHaveLength(2);
  });

  it("deletes a model by id", async () => {
    const id = await saveModel("deleteme.glb", 50, "glb", new ArrayBuffer(50));
    await deleteModel(id);
    expect(await getAllModels()).toHaveLength(0);
  });

  it("stores timestamp", async () => {
    const before = Date.now();
    await saveModel("timed.gltf", 10, "gltf", new ArrayBuffer(10));
    const after = Date.now();
    const models = await getAllModels();
    expect(models[0]?.timestamp).toBeGreaterThanOrEqual(before);
    expect(models[0]?.timestamp).toBeLessThanOrEqual(after);
  });

  it("preserves ArrayBuffer data", async () => {
    const original = new Uint8Array([1, 2, 3, 4, 5]);
    await saveModel("data.glb", 5, "glb", original.buffer);
    const models = await getAllModels();
    expect(new Uint8Array(models[0]!.data)).toEqual(original);
  });

  it("deletes multiple models by ids", async () => {
    const id1 = await saveModel("a.glb", 10, "glb", new ArrayBuffer(10));
    const id2 = await saveModel("b.obj", 20, "obj", new ArrayBuffer(20));
    const id3 = await saveModel("c.stl", 30, "stl", new ArrayBuffer(30));
    await deleteMultipleModels([id1, id3]);
    const remaining = await getAllModels();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.name).toBe("b.obj");
  });

  it("deleteMultipleModels with empty array is a no-op", async () => {
    await saveModel("keep.glb", 10, "glb", new ArrayBuffer(10));
    await deleteMultipleModels([]);
    expect(await getAllModels()).toHaveLength(1);
  });

  it("deletes all models", async () => {
    await saveModel("a.glb", 10, "glb", new ArrayBuffer(10));
    await saveModel("b.obj", 20, "obj", new ArrayBuffer(20));
    await saveModel("c.stl", 30, "stl", new ArrayBuffer(30));
    await deleteAllModels();
    expect(await getAllModels()).toHaveLength(0);
  });

  it("deleteAllModels on empty DB is a no-op", async () => {
    await deleteAllModels();
    expect(await getAllModels()).toHaveLength(0);
  });

  /* ── getAllModelMeta ── */

  it("getAllModelMeta returns metadata without data field", async () => {
    await saveModel("meta.glb", 1024, "glb", new ArrayBuffer(1024));
    const metas = await getAllModelMeta();
    expect(metas).toHaveLength(1);
    expect(metas[0]?.name).toBe("meta.glb");
    expect(metas[0]?.size).toBe(1024);
    expect(metas[0]?.ext).toBe("glb");
    expect(metas[0]?.id).toBeGreaterThan(0);
    expect(metas[0]?.timestamp).toBeGreaterThan(0);
    // The key assertion: data must not be present
    expect("data" in metas[0]!).toBe(false);
  });

  it("getAllModelMeta returns all records", async () => {
    await saveModel("a.glb", 10, "glb", new ArrayBuffer(10));
    await saveModel("b.obj", 20, "obj", new ArrayBuffer(20));
    await saveModel("c.stl", 30, "stl", new ArrayBuffer(30));
    const metas = await getAllModelMeta();
    expect(metas).toHaveLength(3);
    expect(metas.map((m) => m.name)).toEqual(["a.glb", "b.obj", "c.stl"]);
    for (const m of metas) {
      expect("data" in m).toBe(false);
    }
  });

  /* ── getModelData ── */

  it("getModelData returns ArrayBuffer for existing id", async () => {
    const original = new Uint8Array([10, 20, 30]);
    const id = await saveModel("fetch.glb", 3, "glb", original.buffer);
    const result = await getModelData(id);
    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(new Uint8Array(result!)).toEqual(original);
  });

  it("getModelData returns null for non-existent id", async () => {
    const result = await getModelData(999999);
    expect(result).toBeNull();
  });
});
