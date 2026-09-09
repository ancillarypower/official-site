import { describe, it, expect, beforeEach } from "vitest";
import { saveModel, getAllModels, deleteModel } from "@/hooks/useModelDB";

describe("useModelDB", () => {
  beforeEach(async () => {
    const models = await getAllModels();
    for (const m of models) { if (m.id != null) await deleteModel(m.id); }
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
});
