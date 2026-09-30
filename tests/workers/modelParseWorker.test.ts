import { describe, it, expect, vi, beforeEach } from "vitest";

// Capture postMessage before worker module loads
const mockPostMessage = vi.fn();
vi.stubGlobal("postMessage", mockPostMessage);

// Mock Three.js loaders
const mockOBJParse = vi.fn();
const mockSTLParse = vi.fn();

vi.mock("three/examples/jsm/loaders/OBJLoader.js", () => ({
  OBJLoader: class {
    parse = mockOBJParse;
  },
}));

vi.mock("three/examples/jsm/loaders/STLLoader.js", () => ({
  STLLoader: class {
    parse = mockSTLParse;
  },
}));

/** Create a mock mesh child recognized by the traverse check. */
function makeMockMesh(opts: {
  positions: Float32Array;
  normals?: Float32Array | null;
  indices?: Uint16Array | Uint32Array | null;
}) {
  return {
    isMesh: true,
    geometry: {
      getAttribute(name: string) {
        if (name === "position") return { array: opts.positions };
        if (name === "normal") {
          return opts.normals === undefined
            ? { array: new Float32Array(opts.positions.length) }
            : opts.normals
              ? { array: opts.normals }
              : null;
        }
        return null;
      },
      getIndex() {
        return opts.indices === undefined
          ? null
          : opts.indices
            ? { array: opts.indices }
            : null;
      },
    },
  };
}

/** Create a mock Group with traverse. */
function makeMockGroup(children: unknown[]) {
  return {
    traverse(cb: (child: unknown) => void) {
      cb({}); // group node (no isMesh) — skipped by the worker
      for (const c of children) cb(c);
    },
  };
}

/** Create a mock BufferGeometry for STL. */
function makeMockBufferGeometry(opts: {
  positions: Float32Array;
  normals?: Float32Array | null;
  indices?: Uint16Array | Uint32Array | null;
}) {
  return {
    getAttribute(name: string) {
      if (name === "position") return { array: opts.positions };
      if (name === "normal") {
        return opts.normals === undefined
          ? { array: new Float32Array(opts.positions.length) }
          : opts.normals
            ? { array: opts.normals }
            : null;
      }
      return null;
    },
    getIndex() {
      return opts.indices === undefined
        ? null
        : opts.indices
          ? { array: opts.indices }
          : null;
    },
  };
}

describe("modelParseWorker", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubGlobal("postMessage", mockPostMessage);
    await import("@/workers/modelParseWorker");
  });

  it("parses OBJ with positions, normals, and indices (success path)", async () => {
    const positions = new Float32Array([1, 2, 3, 4, 5, 6]);
    const normals = new Float32Array([0, 1, 0, 0, 1, 0]);
    const indices = new Uint32Array([0, 1]);
    const mesh = makeMockMesh({ positions, normals, indices });
    mockOBJParse.mockReturnValue(makeMockGroup([mesh]));

    const event = new MessageEvent("message", {
      data: { format: "obj", buffer: new ArrayBuffer(10) },
    });
    await (self as unknown as { onmessage: (e: MessageEvent) => Promise<void> }).onmessage(event);

    expect(mockPostMessage).toHaveBeenCalledTimes(1);
    const [result] = mockPostMessage.mock.calls[0]!;
    expect(result.type).toBe("result");
    expect(result.meshes).toHaveLength(1);
    expect(result.meshes[0].positions).toBeInstanceOf(Float32Array);
    expect(result.meshes[0].normals).toBeInstanceOf(Float32Array);
    expect(result.meshes[0].indices).toBeInstanceOf(Uint32Array);
  });

  it("OBJ mesh without normals sets normals to null", async () => {
    const positions = new Float32Array([1, 2, 3]);
    const mesh = makeMockMesh({ positions, normals: null, indices: null });
    mockOBJParse.mockReturnValue(makeMockGroup([mesh]));

    const event = new MessageEvent("message", {
      data: { format: "obj", buffer: new ArrayBuffer(5) },
    });
    await (self as unknown as { onmessage: (e: MessageEvent) => Promise<void> }).onmessage(event);

    const [result] = mockPostMessage.mock.calls[0]!;
    expect(result.type).toBe("result");
    expect(result.meshes[0].normals).toBeNull();
    expect(result.meshes[0].indices).toBeNull();
  });

  it("parses STL successfully", async () => {
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]);
    mockSTLParse.mockReturnValue(makeMockBufferGeometry({ positions, normals }));

    const event = new MessageEvent("message", {
      data: { format: "stl", buffer: new ArrayBuffer(80) },
    });
    await (self as unknown as { onmessage: (e: MessageEvent) => Promise<void> }).onmessage(event);

    const [result] = mockPostMessage.mock.calls[0]!;
    expect(result.type).toBe("result");
    expect(result.meshes).toHaveLength(1);
    expect(result.meshes[0].positions).toBeInstanceOf(Float32Array);
  });

  it("returns error for unsupported format", async () => {
    const event = new MessageEvent("message", {
      data: { format: "fbx", buffer: new ArrayBuffer(10) },
    });
    await (self as unknown as { onmessage: (e: MessageEvent) => Promise<void> }).onmessage(event);

    const [result] = mockPostMessage.mock.calls[0]!;
    expect(result.type).toBe("error");
    expect(result.message).toContain("Unsupported format");
  });

  it("returns error when OBJ has no geometry (empty Group)", async () => {
    mockOBJParse.mockReturnValue(makeMockGroup([]));

    const event = new MessageEvent("message", {
      data: { format: "obj", buffer: new ArrayBuffer(10) },
    });
    await (self as unknown as { onmessage: (e: MessageEvent) => Promise<void> }).onmessage(event);

    const [result] = mockPostMessage.mock.calls[0]!;
    expect(result.type).toBe("error");
    expect(result.message).toContain("No geometry");
  });

  it("returns error when STL has no position attribute", async () => {
    mockSTLParse.mockReturnValue({
      getAttribute: () => null,
      getIndex: () => null,
    });

    const event = new MessageEvent("message", {
      data: { format: "stl", buffer: new ArrayBuffer(80) },
    });
    await (self as unknown as { onmessage: (e: MessageEvent) => Promise<void> }).onmessage(event);

    const [result] = mockPostMessage.mock.calls[0]!;
    expect(result.type).toBe("error");
    expect(result.message).toContain("No geometry");
  });

  it("returns error when OBJLoader.parse throws", async () => {
    mockOBJParse.mockImplementation(() => {
      throw new Error("Parse failed");
    });

    const event = new MessageEvent("message", {
      data: { format: "obj", buffer: new ArrayBuffer(10) },
    });
    await (self as unknown as { onmessage: (e: MessageEvent) => Promise<void> }).onmessage(event);

    const [result] = mockPostMessage.mock.calls[0]!;
    expect(result.type).toBe("error");
    expect(result.message).toBe("Parse failed");
  });

  it("catches non-Error throws gracefully", async () => {
    mockOBJParse.mockImplementation(() => {
      throw "string error";
    });

    const event = new MessageEvent("message", {
      data: { format: "obj", buffer: new ArrayBuffer(10) },
    });
    await (self as unknown as { onmessage: (e: MessageEvent) => Promise<void> }).onmessage(event);

    const [result] = mockPostMessage.mock.calls[0]!;
    expect(result.type).toBe("error");
    expect(result.message).toBe("Model parsing failed");
  });

  it("includes transferables for zero-copy transfer", async () => {
    const positions = new Float32Array([1, 2, 3]);
    const normals = new Float32Array([0, 1, 0]);
    const indices = new Uint32Array([0]);
    const mesh = makeMockMesh({ positions, normals, indices });
    mockOBJParse.mockReturnValue(makeMockGroup([mesh]));

    const event = new MessageEvent("message", {
      data: { format: "obj", buffer: new ArrayBuffer(10) },
    });
    await (self as unknown as { onmessage: (e: MessageEvent) => Promise<void> }).onmessage(event);

    const [, transferables] = mockPostMessage.mock.calls[0]!;
    expect(transferables).toBeDefined();
    expect(transferables.length).toBeGreaterThanOrEqual(1);
  });
});
