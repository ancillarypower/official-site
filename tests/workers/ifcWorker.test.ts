import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Capture postMessage before worker module loads
const mockPostMessage = vi.fn();
vi.stubGlobal("postMessage", mockPostMessage);

// Mock IfcAPI methods
const mockInit = vi.fn();
const mockSetWasmPath = vi.fn();
const mockOpenModel = vi.fn();
const mockStreamAllMeshes = vi.fn();
const mockGetGeometry = vi.fn();
const mockGetVertexArray = vi.fn();
const mockGetIndexArray = vi.fn();
const mockCloseModel = vi.fn();
const mockDispose = vi.fn();

vi.mock("web-ifc", () => ({
  IfcAPI: class {
    Init = mockInit;
    SetWasmPath = mockSetWasmPath;
    OpenModel = mockOpenModel;
    StreamAllMeshes = mockStreamAllMeshes;
    GetGeometry = mockGetGeometry;
    GetVertexArray = mockGetVertexArray;
    GetIndexArray = mockGetIndexArray;
    CloseModel = mockCloseModel;
    Dispose = mockDispose;
  },
}));

/** Build a mock placed geometry with color and flatTransformation. */
function makePlacedGeometry(opts?: { colorW?: number }) {
  return {
    geometryExpressID: 1,
    color: { x: 1, y: 0, z: 0, w: opts?.colorW ?? 1 },
    flatTransformation: new Float64Array(16),
  };
}

/** Build a mock flatMesh with a vector-like geometries accessor. */
function makeFlatMesh(pgs: ReturnType<typeof makePlacedGeometry>[]) {
  return {
    geometries: {
      size: () => pgs.length,
      get: (i: number) => pgs[i],
    },
  };
}

/** Build mock vertex data: interleaved pos+normal (6 floats per vertex). */
function makeVertexData(vertexCount: number) {
  const arr = new Float32Array(vertexCount * 6);
  for (let v = 0; v < vertexCount; v++) {
    arr[v * 6] = v;
    arr[v * 6 + 1] = v;
    arr[v * 6 + 2] = v;
    arr[v * 6 + 3] = 0;
    arr[v * 6 + 4] = 1;
    arr[v * 6 + 5] = 0;
  }
  return arr;
}

describe("ifcWorker", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.useRealTimers();
    vi.stubGlobal("postMessage", mockPostMessage);

    // Default happy-path mocks
    mockInit.mockResolvedValue(undefined);
    mockOpenModel.mockReturnValue(0);
    const vertexData = makeVertexData(3);
    const indexData = new Uint32Array([0, 1, 2]);
    const mockGeometry = {
      GetVertexData: () => 1,
      GetVertexDataSize: () => vertexData.length,
      GetIndexData: () => 2,
      GetIndexDataSize: () => indexData.length,
      delete: vi.fn(),
    };
    mockGetGeometry.mockReturnValue(mockGeometry);
    mockGetVertexArray.mockReturnValue(vertexData);
    mockGetIndexArray.mockReturnValue(indexData);
    mockStreamAllMeshes.mockImplementation((_id: number, cb: (fm: unknown) => void) => {
      cb(makeFlatMesh([makePlacedGeometry()]));
    });

    await import("@/workers/ifcWorker");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function fireMessage(buffer?: ArrayBuffer) {
    const event = new MessageEvent("message", {
      data: { buffer: buffer ?? new ArrayBuffer(100), wasmCdn: "https://cdn.example.com/wasm/" },
    });
    return (self as unknown as { onmessage: (e: MessageEvent) => Promise<void> }).onmessage(event);
  }

  it("processes IFC file successfully (happy path)", async () => {
    await fireMessage();

    expect(mockPostMessage).toHaveBeenCalledTimes(1);
    const [result] = mockPostMessage.mock.calls[0]!;
    expect(result.type).toBe("result");
    expect(result.meshes).toHaveLength(1);
    expect(result.meshes[0].positions).toBeInstanceOf(Float32Array);
    expect(result.meshes[0].normals).toBeInstanceOf(Float32Array);
    expect(result.meshes[0].colors).toBeInstanceOf(Float32Array);
    expect(result.meshes[0].indices).toBeInstanceOf(Uint32Array);
    expect(result.meshes[0].transparent).toBe(false);
  });

  it("sets transparent flag when color alpha !== 1", async () => {
    mockStreamAllMeshes.mockImplementation((_id: number, cb: (fm: unknown) => void) => {
      cb(makeFlatMesh([makePlacedGeometry({ colorW: 0.5 })]));
    });

    await fireMessage();

    const [result] = mockPostMessage.mock.calls[0]!;
    expect(result.meshes[0].transparent).toBe(true);
  });

  it("calls CloseModel and Dispose on success", async () => {
    await fireMessage();

    expect(mockCloseModel).toHaveBeenCalledWith(0);
    expect(mockDispose).toHaveBeenCalledTimes(1);
  });

  it("returns error when OpenModel returns -1", async () => {
    mockOpenModel.mockReturnValue(-1);

    await fireMessage();

    const [result] = mockPostMessage.mock.calls[0]!;
    expect(result.type).toBe("error");
    expect(result.message).toContain("unsupported schema");
  });

  it("returns error when Init rejects", async () => {
    mockInit.mockRejectedValue(new Error("WASM load failed"));

    await fireMessage();

    const [result] = mockPostMessage.mock.calls[0]!;
    expect(result.type).toBe("error");
    expect(result.message).toBe("WASM load failed");
  });

  it("calls Dispose on error path (cleanup branch)", async () => {
    mockInit.mockRejectedValue(new Error("boom"));

    await fireMessage();

    expect(mockDispose).toHaveBeenCalled();
  });

  it("returns error on WASM init timeout", async () => {
    vi.useFakeTimers();
    mockInit.mockReturnValue(new Promise(() => {}));

    const promise = fireMessage();
    vi.advanceTimersByTime(30_000);
    await promise;

    const [result] = mockPostMessage.mock.calls[0]!;
    expect(result.type).toBe("error");
    expect(result.message).toContain("timed out");
  });

  it("skips corrupted mesh and continues (mesh error branch)", async () => {
    const vertexData = makeVertexData(3);
    const indexData = new Uint32Array([0, 1, 2]);
    const goodGeometry = {
      GetVertexData: () => 1,
      GetVertexDataSize: () => vertexData.length,
      GetIndexData: () => 2,
      GetIndexDataSize: () => indexData.length,
      delete: vi.fn(),
    };

    let callCount = 0;
    mockGetGeometry.mockImplementation(() => {
      callCount++;
      if (callCount === 1) throw new Error("corrupted");
      return goodGeometry;
    });
    mockGetVertexArray.mockReturnValue(vertexData);
    mockGetIndexArray.mockReturnValue(indexData);

    mockStreamAllMeshes.mockImplementation((_id: number, cb: (fm: unknown) => void) => {
      cb(makeFlatMesh([makePlacedGeometry(), makePlacedGeometry()]));
    });

    await fireMessage();

    const [result] = mockPostMessage.mock.calls[0]!;
    expect(result.type).toBe("result");
    expect(result.meshes).toHaveLength(1);
  });

  it("calls geometry.delete() even on mesh error (finally branch)", async () => {
    const deleteFunc = vi.fn();
    const badGeometry = {
      GetVertexData: () => { throw new Error("bad vertex"); },
      GetVertexDataSize: () => 0,
      GetIndexData: () => 0,
      GetIndexDataSize: () => 0,
      delete: deleteFunc,
    };
    mockGetGeometry.mockReturnValue(badGeometry);

    mockStreamAllMeshes.mockImplementation((_id: number, cb: (fm: unknown) => void) => {
      cb(makeFlatMesh([makePlacedGeometry()]));
    });

    await fireMessage();

    expect(deleteFunc).toHaveBeenCalled();
  });

  it("handles non-Error throw in outer catch", async () => {
    mockInit.mockRejectedValue("string error");

    await fireMessage();

    const [result] = mockPostMessage.mock.calls[0]!;
    expect(result.type).toBe("error");
    expect(result.message).toBe("IFC processing failed");
  });

  it("includes transferables for zero-copy transfer", async () => {
    await fireMessage();

    const [, transferables] = mockPostMessage.mock.calls[0]!;
    expect(transferables).toBeDefined();
    expect(transferables.length).toBe(4);
  });

  it("Dispose failure is silently caught on success path", async () => {
    mockDispose.mockImplementation(() => { throw new Error("already freed"); });

    await fireMessage();

    const [result] = mockPostMessage.mock.calls[0]!;
    expect(result.type).toBe("result");
  });
});
