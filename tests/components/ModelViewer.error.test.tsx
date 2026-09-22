/**
 * Regression tests for GLTF error callback handling (#46)
 * and IFC BufferGeometry leak (#291).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";

// Polyfill Fullscreen API for jsdom (#451)
if (!Element.prototype.requestFullscreen) {
  Element.prototype.requestFullscreen = function () { return Promise.resolve(); } as () => Promise<void>;
}
if (!document.exitFullscreen) {
  document.exitFullscreen = function () { return Promise.resolve(); } as () => Promise<void>;
}

const { gltfParseSpy, mergeGeometriesSpy, bufferGeometryInstances } = vi.hoisted(() => ({
  gltfParseSpy: vi.fn(),
  mergeGeometriesSpy: vi.fn().mockReturnValue({}),
  bufferGeometryInstances: [] as Array<{ setAttribute: ReturnType<typeof vi.fn>; setIndex: ReturnType<typeof vi.fn>; applyMatrix4: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> }>,
}));

vi.mock("@/hooks/useModelDB", () => ({
  getModelData: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

vi.mock("web-ifc", () => ({
  IfcAPI: vi.fn().mockImplementation(() => ({
    SetWasmPath: vi.fn(), Init: vi.fn(), OpenModel: vi.fn().mockReturnValue(0),
    CloseModel: vi.fn(),
    GetGeometry: vi.fn().mockReturnValue({
      GetVertexData: () => 0, GetVertexDataSize: () => 0,
      GetIndexData: () => 0, GetIndexDataSize: () => 0, delete: vi.fn(),
    }),
    GetVertexArray: vi.fn().mockReturnValue(new Float32Array([0, 1, 2, 0, 0, 1])),
    GetIndexArray: vi.fn().mockReturnValue(new Uint32Array([0])),
    StreamAllMeshes: vi.fn(),
  })),
}));

vi.mock("three", async () => ({
  Color: vi.fn().mockImplementation(() => ({ r: 0.5, g: 0.5, b: 0.5, setRGB: vi.fn().mockReturnThis() })),
  Scene: vi.fn().mockImplementation(() => ({ background: null, environment: null, add: vi.fn(), traverse: vi.fn() })),
  PerspectiveCamera: vi.fn().mockImplementation(() => ({
    position: { set: vi.fn() }, aspect: 1, near: 0.01, far: 1000, updateProjectionMatrix: vi.fn(),
  })),
  WebGLRenderer: vi.fn().mockImplementation(() => {
    const canvas = document.createElement("canvas");
    return {
      setSize: vi.fn(), setPixelRatio: vi.fn(), toneMapping: 0, toneMappingExposure: 1,
      domElement: canvas, render: vi.fn(), dispose: vi.fn(),
    };
  }),
  AmbientLight: vi.fn(),
  DirectionalLight: vi.fn().mockImplementation(() => ({ position: { set: vi.fn() } })),
  GridHelper: vi.fn(),
  Box3: vi.fn().mockImplementation(() => ({
    setFromObject: vi.fn().mockReturnThis(), isEmpty: vi.fn().mockReturnValue(false),
    getCenter: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0, copy: vi.fn() }),
    getSize: vi.fn().mockReturnValue({ x: 1, y: 1, z: 1 }),
  })),
  Vector3: vi.fn().mockImplementation(() => ({ x: 0, y: 0, z: 0, copy: vi.fn() })),
  Group: vi.fn().mockImplementation(() => ({ children: [{}], add: vi.fn() })),
  Mesh: vi.fn(), MeshPhongMaterial: vi.fn().mockImplementation(() => ({ dispose: vi.fn() })),
  MeshStandardMaterial: vi.fn(),
  BufferGeometry: vi.fn().mockImplementation(() => {
    const instance = { setAttribute: vi.fn(), setIndex: vi.fn(), applyMatrix4: vi.fn().mockReturnThis(), dispose: vi.fn() };
    bufferGeometryInstances.push(instance);
    return instance;
  }),
  BufferAttribute: vi.fn(),
  Matrix4: vi.fn().mockImplementation(() => ({ fromArray: vi.fn().mockReturnThis() })),
  PMREMGenerator: vi.fn().mockImplementation(() => ({ fromScene: vi.fn().mockReturnValue({ texture: {} }), dispose: vi.fn() })),
  ACESFilmicToneMapping: 0, DoubleSide: 2, SRGBColorSpace: "srgb",
}));

vi.mock("three/examples/jsm/controls/OrbitControls.js", () => ({
  OrbitControls: vi.fn().mockImplementation(() => ({
    enableDamping: false, dampingFactor: 0, autoRotate: false, autoRotateSpeed: 0,
    target: { copy: vi.fn() }, update: vi.fn(), dispose: vi.fn(),
  })),
}));
vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: vi.fn().mockImplementation(() => ({ setDRACOLoader: vi.fn(), parse: gltfParseSpy })),
}));
vi.mock("three/examples/jsm/loaders/DRACOLoader.js", () => ({
  DRACOLoader: vi.fn().mockImplementation(() => ({ setDecoderPath: vi.fn(), dispose: vi.fn() })),
}));
vi.mock("three/examples/jsm/loaders/OBJLoader.js", () => ({
  OBJLoader: vi.fn().mockImplementation(() => ({ parse: vi.fn(() => ({ children: [{}], add: vi.fn() })) })),
}));
vi.mock("three/examples/jsm/loaders/STLLoader.js", () => ({
  STLLoader: vi.fn().mockImplementation(() => ({ parse: vi.fn(() => ({})) })),
}));
vi.mock("three/examples/jsm/environments/RoomEnvironment.js", () => ({ RoomEnvironment: vi.fn() }));
vi.mock("three/examples/jsm/utils/BufferGeometryUtils.js", () => ({ mergeGeometries: mergeGeometriesSpy }));

describe("ModelViewer GLTF error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bufferGeometryInstances.length = 0;
    mergeGeometriesSpy.mockReturnValue({});
    vi.stubGlobal("ResizeObserver", vi.fn().mockImplementation(() => ({ observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() })));
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  it("shows error message when GLTF parsing fails", async () => {
    gltfParseSpy.mockImplementation((_d: unknown, _p: string, _onLoad: unknown, onError: (e: Error) => void) => { onError(new Error("corrupt file")); });
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="bad.glb" ext="glb" modelId={1} /></I18nProvider>);
    await waitFor(() => { expect(screen.getByText(/corrupt file/)).toBeInTheDocument(); });
  });

  it("shows error when GLTF scene has no visible geometry", async () => {
    gltfParseSpy.mockImplementation((_d: unknown, _p: string, onLoad: (r: unknown) => void) => { onLoad({ scene: { children: [{}], add: vi.fn() } }); });
    const threeMod = await import("three");
    vi.mocked(threeMod.Box3).mockImplementation(() => ({ setFromObject: vi.fn().mockReturnThis(), isEmpty: vi.fn().mockReturnValue(true), getCenter: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0, copy: vi.fn() }), getSize: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0 }) }) as any);
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="empty.glb" ext="glb" modelId={1} /></I18nProvider>);
    await waitFor(() => { expect(screen.getByText(/No visible geometry/)).toBeInTheDocument(); });
  });

  it("does not throw when error callback fires after unmount", async () => {
    let capturedOnError: ((e: Error) => void) | null = null;
    gltfParseSpy.mockImplementation((_d: unknown, _p: string, _onLoad: unknown, onError: (e: Error) => void) => { capturedOnError = onError; });
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    const { unmount } = render(<I18nProvider><ModelViewer name="bad.glb" ext="glb" modelId={1} /></I18nProvider>);
    await waitFor(() => { expect(capturedOnError).not.toBeNull(); });
    unmount();
    expect(() => capturedOnError!(new Error("late error"))).not.toThrow();
  });
});

describe("ModelViewer IFC BufferGeometry leak (#291)", () => {
  let capturedWorkerOnmessage: ((e: MessageEvent) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    bufferGeometryInstances.length = 0;
    capturedWorkerOnmessage = null;
    mergeGeometriesSpy.mockReturnValue({});
    vi.stubGlobal("ResizeObserver", vi.fn().mockImplementation(() => ({ observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() })));
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("Worker", vi.fn().mockImplementation(() => {
      const w = { postMessage: vi.fn(), terminate: vi.fn(), onmessage: null as ((e: MessageEvent) => void) | null, onerror: null as ((e: ErrorEvent) => void) | null };
      return new Proxy(w, { set(target, prop, value) { if (prop === "onmessage") capturedWorkerOnmessage = value as (e: MessageEvent) => void; (target as Record<string | symbol, unknown>)[prop] = value; return true; } });
    }));
  });

  function makeIfcResultEvent(opaqueCount: number, transparentCount: number): MessageEvent {
    const meshes = [];
    for (let i = 0; i < opaqueCount + transparentCount; i++) {
      meshes.push({ positions: new Float32Array([0, 1, 2]), normals: new Float32Array([0, 0, 1]), colors: new Float32Array([1, 1, 1, 1]), indices: new Uint32Array([0]), flatTransformation: [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1], transparent: i >= opaqueCount });
    }
    return { data: { type: "result", meshes } } as unknown as MessageEvent;
  }

  it("disposes intermediate BufferGeometry objects when IFC mergeGeometries throws (regression #291)", async () => {
    mergeGeometriesSpy.mockImplementationOnce(() => { throw new Error("merge failed"); });
    const threeMod = await import("three");
    vi.mocked(threeMod.Group).mockImplementation(() => ({ children: [] as unknown[], add: vi.fn() }) as unknown as InstanceType<typeof threeMod.Group>);
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="test.ifc" ext="ifc" modelId={1} /></I18nProvider>);
    await waitFor(() => { expect(capturedWorkerOnmessage).not.toBeNull(); });
    capturedWorkerOnmessage!(makeIfcResultEvent(2, 1));
    expect(bufferGeometryInstances).toHaveLength(3);
    for (const instance of bufferGeometryInstances) { expect(instance.dispose).toHaveBeenCalled(); }
    await waitFor(() => { expect(screen.getByText(/merge failed/)).toBeInTheDocument(); });
  });

  it("disposes merged geometries in group when IFC group has no visible children (regression #291)", async () => {
    const mergedGeomDispose = vi.fn();
    const mergedMaterialDispose = vi.fn();
    mergeGeometriesSpy.mockReturnValue({ dispose: mergedGeomDispose });
    const threeMod = await import("three");
    vi.mocked(threeMod.Mesh).mockImplementation(() => ({ isMesh: true, geometry: { dispose: mergedGeomDispose }, material: { dispose: mergedMaterialDispose } }) as unknown as InstanceType<typeof threeMod.Mesh>);
    const groupChildren: unknown[] = [];
    vi.mocked(threeMod.Group).mockImplementation(() => ({ children: groupChildren, add: vi.fn().mockImplementation((...args: unknown[]) => { groupChildren.push(...args); }) }) as unknown as InstanceType<typeof threeMod.Group>);
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="test.ifc" ext="ifc" modelId={1} /></I18nProvider>);
    await waitFor(() => { expect(capturedWorkerOnmessage).not.toBeNull(); });
    mergeGeometriesSpy.mockReturnValue(null);
    capturedWorkerOnmessage!(makeIfcResultEvent(1, 0));
    await waitFor(() => { expect(screen.getByText(/No visible geometry in IFC file/)).toBeInTheDocument(); });
    expect(bufferGeometryInstances).toHaveLength(1);
    expect(bufferGeometryInstances[0]!.dispose).toHaveBeenCalled();
  });
});
