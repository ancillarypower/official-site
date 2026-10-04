import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createLoaderResources,
  cleanupLoaderResources,
  type LoaderContext,
  type LoaderResources,
} from "@/components/models/modelLoaders";

// --- Worker mock ---
const mockWorkerTerminate = vi.fn();
let lastWorkerInstance: {
  onmessage: ((e: { data: unknown }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  terminate: ReturnType<typeof vi.fn>;
  postMessage: ReturnType<typeof vi.fn>;
} | null = null;

class MockWorker {
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  terminate = mockWorkerTerminate;
  postMessage = vi.fn();

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    lastWorkerInstance = this;
  }
}

// --- Three.js mocks ---
const mockGLTFParse = vi.fn();
const mockSetDRACOLoader = vi.fn();
const mockSetDecoderPath = vi.fn();
const mockDracoDispose = vi.fn();

vi.mock("three", async () => ({
  BufferGeometry: vi.fn().mockImplementation(() => ({
    setAttribute: vi.fn(),
    setIndex: vi.fn(),
    applyMatrix4: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
  })),
  BufferAttribute: vi.fn(),
  Matrix4: vi.fn().mockImplementation(() => ({
    fromArray: vi.fn().mockReturnThis(),
  })),
  Group: vi.fn().mockImplementation(() => ({
    children: [],
    add: vi.fn().mockImplementation(function (
      this: { children: unknown[] },
      c: unknown,
    ) {
      this.children.push(c);
    }),
  })),
  Mesh: vi.fn(),
  MeshPhongMaterial: vi.fn(),
  MeshStandardMaterial: vi.fn(),
  DoubleSide: 2,
}));

vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: vi.fn().mockImplementation(() => ({
    setDRACOLoader: mockSetDRACOLoader,
    parse: mockGLTFParse,
  })),
}));

vi.mock("three/examples/jsm/loaders/DRACOLoader.js", () => ({
  DRACOLoader: vi.fn().mockImplementation(() => ({
    setDecoderPath: mockSetDecoderPath,
    dispose: mockDracoDispose,
  })),
}));

vi.mock("three/examples/jsm/utils/BufferGeometryUtils.js", () => ({
  mergeGeometries: vi.fn().mockReturnValue({}),
}));

function createMockContext(
  overrides?: Partial<LoaderContext>,
): LoaderContext {
  return {
    fitToView: vi.fn(),
    isDisposed: vi.fn().mockReturnValue(false),
    setStatus: vi.fn(),
    setErrorMsg: vi.fn(),
    ...overrides,
  };
}

describe("modelLoaders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastWorkerInstance = null;
    vi.stubGlobal("Worker", MockWorker);
  });

  describe("createLoaderResources", () => {
    it("returns a fresh resources bag with all null fields", () => {
      const res = createLoaderResources();
      expect(res.dracoLoader).toBeNull();
      expect(res.ifcWorker).toBeNull();
      expect(res.modelParseWorker).toBeNull();
    });
  });

  describe("cleanupLoaderResources", () => {
    it("terminates workers and disposes draco (unit #487)", () => {
      const mockDispose = vi.fn();
      const mockTerm1 = vi.fn();
      const mockTerm2 = vi.fn();
      const res: LoaderResources = {
        dracoLoader: { dispose: mockDispose },
        ifcWorker: { terminate: mockTerm1 } as unknown as Worker,
        modelParseWorker: { terminate: mockTerm2 } as unknown as Worker,
      };
      cleanupLoaderResources(res);
      expect(mockDispose).toHaveBeenCalledTimes(1);
      expect(mockTerm1).toHaveBeenCalledTimes(1);
      expect(mockTerm2).toHaveBeenCalledTimes(1);
      expect(res.dracoLoader).toBeNull();
      expect(res.ifcWorker).toBeNull();
      expect(res.modelParseWorker).toBeNull();
    });

    it("handles all-null resources without throwing", () => {
      const res = createLoaderResources();
      expect(() => cleanupLoaderResources(res)).not.toThrow();
    });
  });

  describe("loadGltfModel", () => {
    it("calls GLTFLoader.parse with correct payload (unit #487)", async () => {
      const { loadGltfModel } = await import(
        "@/components/models/modelLoaders"
      );
      const ctx = createMockContext();
      const res = createLoaderResources();
      const buf = new ArrayBuffer(8);

      // Make parse invoke success callback immediately so promise resolves
      mockGLTFParse.mockImplementation(
        (_p: unknown, _b: string, onSuccess: (r: { scene: unknown }) => void) => {
          onSuccess({ scene: {} });
        },
      );

      await loadGltfModel(buf, "glb", ctx, res);

      expect(mockGLTFParse).toHaveBeenCalledTimes(1);
      expect(mockGLTFParse.mock.calls[0]![0]).toBe(buf);
      expect(mockSetDRACOLoader).toHaveBeenCalledTimes(1);
      expect(res.dracoLoader).not.toBeNull();
    });

    it("skips loading when already disposed (unit #487)", async () => {
      const { loadGltfModel } = await import(
        "@/components/models/modelLoaders"
      );
      const ctx = createMockContext({
        isDisposed: vi.fn().mockReturnValue(true),
      });
      const res = createLoaderResources();

      await loadGltfModel(new ArrayBuffer(8), "glb", ctx, res);

      expect(mockGLTFParse).not.toHaveBeenCalled();
      expect(res.dracoLoader).toBeNull();
    });

    it("Promise does not resolve until parse callback fires (regression #514)", async () => {
      const { loadGltfModel } = await import(
        "@/components/models/modelLoaders"
      );
      const ctx = createMockContext();
      const res = createLoaderResources();
      const buf = new ArrayBuffer(8);

      // Capture callbacks without invoking them
      let capturedSuccess: ((r: { scene: unknown }) => void) | null = null;
      mockGLTFParse.mockImplementation(
        (_p: unknown, _b: string, onSuccess: (r: { scene: unknown }) => void) => {
          capturedSuccess = onSuccess;
        },
      );

      let resolved = false;
      const promise = loadGltfModel(buf, "glb", ctx, res).then(() => {
        resolved = true;
      });

      // Flush microtasks to let Promise.all imports resolve
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));

      // Promise should still be pending (parse not yet complete)
      expect(resolved).toBe(false);
      expect(mockGLTFParse).toHaveBeenCalledTimes(1);

      // Now trigger success callback
      capturedSuccess!({ scene: {} });
      await promise;

      expect(resolved).toBe(true);
      expect(ctx.fitToView).toHaveBeenCalledTimes(1);
    });

    it("error callback resolves (not rejects) Promise (regression #514)", async () => {
      const { loadGltfModel } = await import(
        "@/components/models/modelLoaders"
      );
      const ctx = createMockContext();
      const res = createLoaderResources();
      const buf = new ArrayBuffer(8);

      // Capture error callback
      let capturedError: ((e: Error) => void) | null = null;
      mockGLTFParse.mockImplementation(
        (_p: unknown, _b: string, _onSuccess: unknown, onError: (e: Error) => void) => {
          capturedError = onError;
        },
      );

      const promise = loadGltfModel(buf, "glb", ctx, res);

      // Flush microtasks
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));

      // Trigger error callback
      capturedError!(new Error("Parse failed"));

      // Should resolve without throwing
      await expect(promise).resolves.toBeUndefined();

      expect(ctx.setErrorMsg).toHaveBeenCalledWith("Parse failed");
      expect(ctx.setStatus).toHaveBeenCalledWith("error");
    });
  });

  describe("loadIfcModel", () => {
    it("creates Worker and posts buffer (unit #487)", async () => {
      const { loadIfcModel } = await import(
        "@/components/models/modelLoaders"
      );
      const ctx = createMockContext();
      const res = createLoaderResources();
      const buf = new ArrayBuffer(8);

      await loadIfcModel(buf, ctx, res);

      expect(lastWorkerInstance).not.toBeNull();
      expect(lastWorkerInstance!.postMessage).toHaveBeenCalledTimes(1);
      expect(res.ifcWorker).toBe(lastWorkerInstance);
    });
  });

  describe("loadObjStlModel", () => {
    it("creates Worker with format identifier for STL (unit #487)", async () => {
      const { loadObjStlModel } = await import(
        "@/components/models/modelLoaders"
      );
      const ctx = createMockContext();
      const res = createLoaderResources();
      const buf = new ArrayBuffer(8);

      await loadObjStlModel(buf, "stl", ctx, res);

      expect(lastWorkerInstance).not.toBeNull();
      expect(lastWorkerInstance!.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ format: "stl" }),
        expect.any(Array),
      );
      expect(res.modelParseWorker).toBe(lastWorkerInstance);
    });

    it("creates Worker with format identifier for OBJ (unit #487)", async () => {
      const { loadObjStlModel } = await import(
        "@/components/models/modelLoaders"
      );
      const ctx = createMockContext();
      const res = createLoaderResources();
      const buf = new ArrayBuffer(8);

      await loadObjStlModel(buf, "obj", ctx, res);

      expect(lastWorkerInstance).not.toBeNull();
      expect(lastWorkerInstance!.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ format: "obj" }),
        expect.any(Array),
      );
    });

    it("STL empty meshes array triggers error state instead of crashing (regression #511)", async () => {
      const { loadObjStlModel } = await import(
        "@/components/models/modelLoaders"
      );
      const ctx = createMockContext();
      const res = createLoaderResources();
      const buf = new ArrayBuffer(8);

      await loadObjStlModel(buf, "stl", ctx, res);

      // Simulate Worker returning empty meshes array
      lastWorkerInstance!.onmessage!({
        data: { type: "result", meshes: [] },
      });

      expect(ctx.setErrorMsg).toHaveBeenCalledWith(
        "STL file contains no geometry",
      );
      expect(ctx.setStatus).toHaveBeenCalledWith("error");
      expect(ctx.fitToView).not.toHaveBeenCalled();
    });
  });

  describe("loadModel", () => {
    it("routes IFC to loadIfcModel (unit #487)", async () => {
      const { loadModel } = await import(
        "@/components/models/modelLoaders"
      );
      const ctx = createMockContext();
      const res = createLoaderResources();

      await loadModel(new ArrayBuffer(8), "ifc", ctx, res);

      expect(res.ifcWorker).not.toBeNull();
    });

    it("routes GLB to loadGltfModel (unit #487)", async () => {
      const { loadModel } = await import(
        "@/components/models/modelLoaders"
      );
      const ctx = createMockContext();
      const res = createLoaderResources();

      // Need parse to resolve for loadModel to complete
      mockGLTFParse.mockImplementation(
        (_p: unknown, _b: string, onSuccess: (r: { scene: unknown }) => void) => {
          onSuccess({ scene: {} });
        },
      );

      await loadModel(new ArrayBuffer(8), "glb", ctx, res);

      expect(mockGLTFParse).toHaveBeenCalledTimes(1);
    });

    it("routes STL to loadObjStlModel (unit #487)", async () => {
      const { loadModel } = await import(
        "@/components/models/modelLoaders"
      );
      const ctx = createMockContext();
      const res = createLoaderResources();

      await loadModel(new ArrayBuffer(8), "stl", ctx, res);

      expect(res.modelParseWorker).not.toBeNull();
    });
  });

  // Uses the real constants on purpose: decoders must be fetched from our own
  // origin under Vite's BASE_URL, never from a third-party CDN.
  describe("self-hosted decoders (regression #586)", () => {
    const origin = window.location.origin;
    const base = import.meta.env.BASE_URL;

    it("DRACOLoader decoder path is same-origin under BASE_URL", async () => {
      const { loadGltfModel } = await import(
        "@/components/models/modelLoaders"
      );
      mockGLTFParse.mockImplementation(
        (_p: unknown, _b: string, onSuccess: (r: { scene: unknown }) => void) => {
          onSuccess({ scene: {} });
        },
      );

      await loadGltfModel(new ArrayBuffer(8), "glb", createMockContext(), createLoaderResources());

      expect(mockSetDecoderPath).toHaveBeenCalledTimes(1);
      const path = String(mockSetDecoderPath.mock.calls[0]![0]);
      expect(new URL(path).origin).toBe(origin);
      expect(path).toBe(`${origin}${base}decoders/draco/gltf/`);
    });

    it("IFC worker receives a same-origin absolute WASM path", async () => {
      const { loadIfcModel } = await import(
        "@/components/models/modelLoaders"
      );

      await loadIfcModel(new ArrayBuffer(8), createMockContext(), createLoaderResources());

      expect(lastWorkerInstance!.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ wasmPath: `${origin}${base}decoders/web-ifc/` }),
        expect.any(Array),
      );
    });
  });
});
