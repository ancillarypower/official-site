import { beforeEach, describe, expect, it, vi } from "vitest";
import { openDB, type IDBPDatabase } from "idb";
import { _resetDB, getAllModels, saveModel } from "@/hooks/useModelDB";

vi.mock("idb", () => ({ openDB: vi.fn() }));

const open = vi.mocked(openDB);

function database() {
  const getAll = vi.fn().mockResolvedValue([]);
  const add = vi.fn().mockResolvedValue(1);
  const close = vi.fn();
  return { db: { getAll, add, close } as unknown as IDBPDatabase, getAll, add, close };
}

function callbacks(index = 0) {
  return open.mock.calls[index]![2]!;
}

 describe("IndexedDB connection recovery (Issue #604)", () => {
  beforeEach(() => {
    _resetDB();
    open.mockReset();
  });

  it("preserves the opening error and retries only on the next operation", async () => {
    const error = new Error("temporary open failure");
    const next = database();
    open.mockRejectedValueOnce(error).mockResolvedValueOnce(next.db);

    await expect(getAllModels()).rejects.toBe(error);
    expect(open).toHaveBeenCalledTimes(1);
    await expect(getAllModels()).resolves.toEqual([]);
    expect(open).toHaveBeenCalledTimes(2);
  });

  it("shares a failed opening across concurrent callers, then permits recovery", async () => {
    const error = new Error("unavailable");
    const next = database();
    open.mockRejectedValueOnce(error).mockResolvedValueOnce(next.db);

    const results = await Promise.allSettled([getAllModels(), getAllModels()]);
    expect(results).toEqual([
      { status: "rejected", reason: error },
      { status: "rejected", reason: error },
    ]);
    expect(open).toHaveBeenCalledTimes(1);
    await expect(getAllModels()).resolves.toEqual([]);
    expect(open).toHaveBeenCalledTimes(2);
  });

  it("shares one pending connection and reuses it after opening", async () => {
    const current = database();
    let resolve!: (db: IDBPDatabase) => void;
    open.mockReturnValueOnce(new Promise((done) => { resolve = done; }));

    const first = getAllModels();
    const second = getAllModels();
    expect(open).toHaveBeenCalledTimes(1);
    resolve(current.db);
    await Promise.all([first, second]);
    await getAllModels();
    expect(open).toHaveBeenCalledTimes(1);
    expect(current.getAll).toHaveBeenCalledTimes(3);
  });

  it("opens a new connection after abnormal termination", async () => {
    const first = database();
    const next = database();
    open.mockResolvedValueOnce(first.db).mockResolvedValueOnce(next.db);
    await getAllModels();

    callbacks().terminated?.();
    await getAllModels();
    expect(open).toHaveBeenCalledTimes(2);
    expect(next.getAll).toHaveBeenCalledOnce();
  });

  it("closes a blocking connection and reopens for the next operation", async () => {
    const first = database();
    const next = database();
    open.mockResolvedValueOnce(first.db).mockResolvedValueOnce(next.db);
    await getAllModels();

    callbacks().blocking?.(1, 2, {} as IDBVersionChangeEvent);
    await getAllModels();
    expect(first.close).toHaveBeenCalledOnce();
    expect(open).toHaveBeenCalledTimes(2);
    expect(next.getAll).toHaveBeenCalledOnce();
  });

  it("does not let an old termination callback invalidate a newer connection", async () => {
    const first = database();
    const next = database();
    open.mockResolvedValueOnce(first.db).mockResolvedValueOnce(next.db);
    await getAllModels();
    const old = callbacks();
    _resetDB();
    await getAllModels();

    old.terminated?.();
    await getAllModels();
    expect(open).toHaveBeenCalledTimes(2);
    expect(next.getAll).toHaveBeenCalledTimes(2);
  });

  it("closes only the old connection when its blocking callback arrives late", async () => {
    const first = database();
    const next = database();
    open.mockResolvedValueOnce(first.db).mockResolvedValueOnce(next.db);
    await getAllModels();
    const old = callbacks();
    _resetDB();
    await getAllModels();

    old.blocking?.(1, 2, {} as IDBVersionChangeEvent);
    await getAllModels();
    expect(first.close).toHaveBeenCalledOnce();
    expect(next.close).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledTimes(2);
  });

  it("does not let an older rejected opening clear the newer cached connection", async () => {
    const error = new Error("late failure");
    const next = database();
    let reject!: (reason: Error) => void;
    open.mockReturnValueOnce(new Promise((_resolve, fail) => { reject = fail; }));
    open.mockResolvedValueOnce(next.db);
    const oldResult = getAllModels().catch((reason: unknown) => reason);
    _resetDB();
    await getAllModels();

    reject(error);
    expect(await oldResult).toBe(error);
    await getAllModels();
    expect(open).toHaveBeenCalledTimes(2);
    expect(next.getAll).toHaveBeenCalledTimes(2);
  });

  it("does not replay failed writes or discard a healthy connection", async () => {
    const current = database();
    const error = new Error("write failed");
    current.add.mockRejectedValueOnce(error);
    open.mockResolvedValueOnce(current.db);

    await expect(saveModel("a.glb", 1, "glb", new ArrayBuffer(1))).rejects.toBe(error);
    expect(current.add).toHaveBeenCalledOnce();
    await getAllModels();
    expect(open).toHaveBeenCalledTimes(1);
    expect(current.add).toHaveBeenCalledOnce();
  });
});
