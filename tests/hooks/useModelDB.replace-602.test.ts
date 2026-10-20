import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  _resetDB,
  deleteAllModels,
  getAllModels,
  getModelData,
  replaceModel,
  saveModel,
} from "@/hooks/useModelDB";

describe("replaceModel (Issue #602)", () => {
  afterEach(() => vi.restoreAllMocks());

  beforeEach(async () => {
    _resetDB();
    await deleteAllModels();
  });

  it("replaces a model with a new id and preserves the new record", async () => {
    const oldId = await saveModel("model.glb", 3, "glb", new Uint8Array([1, 2, 3]).buffer, "old-hash");
    const data = new Uint8Array([4, 5, 6, 7]).buffer;

    const newId = await replaceModel(oldId, "model.glb", 4, "glb", data, "new-hash");

    expect(newId).not.toBe(oldId);
    expect(await getAllModels()).toMatchObject([
      { id: newId, name: "model.glb", size: 4, ext: "glb", hash: "new-hash" },
    ]);
    expect(new Uint8Array((await getModelData(newId))!)).toEqual(new Uint8Array(data));
    expect(await getModelData(oldId)).toBeNull();
  });

  it("rolls back the completed delete when adding uncloneable data fails", async () => {
    const oldData = new Uint8Array([1, 2, 3]).buffer;
    const oldId = await saveModel("model.glb", 3, "glb", oldData, "old-hash");
    const uncloneable = (() => {}) as unknown as ArrayBuffer;

    await expect(replaceModel(oldId, "model.glb", 1, "glb", uncloneable, "new-hash"))
      .rejects.toMatchObject({ name: "DataCloneError" });

    expect(await getAllModels()).toMatchObject([
      { id: oldId, name: "model.glb", size: 3, ext: "glb", hash: "old-hash" },
    ]);
    expect(new Uint8Array((await getModelData(oldId))!)).toEqual(new Uint8Array(oldData));
  });

  it("rolls back on a simulated quota failure after the delete request succeeds", async () => {
    const oldData = new Uint8Array([8, 9]).buffer;
    const oldId = await saveModel("quota.glb", 2, "glb", oldData, "old-hash");
    const add = vi.spyOn(IDBObjectStore.prototype, "add").mockImplementationOnce(() => {
      throw new DOMException("Simulated storage quota exhaustion", "QuotaExceededError");
    });

    await expect(replaceModel(oldId, "quota.glb", 4, "glb", new ArrayBuffer(4), "new-hash"))
      .rejects.toMatchObject({ name: "QuotaExceededError" });

    expect(add).toHaveBeenCalledOnce();
    expect(await getAllModels()).toMatchObject([
      { id: oldId, name: "quota.glb", size: 2, ext: "glb", hash: "old-hash" },
    ]);
    expect(new Uint8Array((await getModelData(oldId))!)).toEqual(new Uint8Array(oldData));
  });

  it("waits for transaction completion after successful requests", async () => {
    const oldId = await saveModel("commit.glb", 1, "glb", new ArrayBuffer(1));
    let addSucceeded = false;
    let abortedAfterRequests = false;
    const nativeAdd = IDBObjectStore.prototype.add;
    const addSpy = vi.spyOn(IDBObjectStore.prototype, "add").mockImplementation(function (...args) {
      const request = nativeAdd.apply(this, args);
      request.addEventListener("success", () => {
        addSucceeded = true;
        const transaction = this.transaction;
        const followup = this.get(-1);
        followup.addEventListener("success", () => {
          abortedAfterRequests = true;
          transaction.abort();
        }, { once: true });
      }, { once: true });
      return request;
    });

    await expect(replaceModel(oldId, "commit.glb", 2, "glb", new ArrayBuffer(2)))
      .rejects.toMatchObject({ name: "AbortError" });

    expect(addSpy).toHaveBeenCalledOnce();
    expect(addSucceeded).toBe(true);
    expect(abortedAfterRequests).toBe(true);
    expect(await getAllModels()).toMatchObject([{ id: oldId, name: "commit.glb", size: 1 }]);
  });

  it("does not insert a model when the old id does not exist", async () => {
    const oldId = await saveModel("existing.glb", 1, "glb", new ArrayBuffer(1));

    await expect(replaceModel(999_999, "missing.glb", 2, "glb", new ArrayBuffer(2)))
      .rejects.toThrow("Model 999999 not found");

    expect(await getAllModels()).toMatchObject([{ id: oldId, name: "existing.glb" }]);
  });
});
