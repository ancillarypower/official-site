/**
 * Regression tests for lazy 3D loader imports (#305) and
 * Worker-based OBJ/STL parsing (#447).
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

const { gltfLoaderCtor, dracoLoaderCtor, objLoaderCtor, stlLoaderCtor } = vi.hoisted(() => ({
  gltfLoaderCtor: vi.fn(),
  dracoLoaderCtor: vi.fn(),
  objLoaderCtor: vi.fn(),
  stlLoaderCtor: vi.fn(),
}));

vi.mock("@/hooks/useModelDB", () => ({
  getModelData: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

vi.mock("three", async () => ({
  Color: vi.fn().mockImplementation(() => ({ r: 0.5, g: 0.5, b: 0.5, setRGB: vi.fn().mockReturnThis() })),
  Scene: vi.fn().mockImplementation(() => ({ background: null, environment: null, add: vi.fn(), traverse: vi.fn() })),
  PerspectiveCamera: vi.fn().mockImplementation(() => ({ position: { set: vi.fn() }, aspect: 1, near: 0.01, far: 1000, updateProjectionMatrix: vi.fn() })),
  WebGLRenderer: vi.fn().mockImplementation(() => { const c = document.createElement("canvas"); return { setSize: vi.fn(), setPixelRatio: vi.fn(), toneMapping: 0, toneMappingExposure: 1, domElement: c, render: vi.fn(), dispose: vi.fn() }; }),
  AmbientLight: vi.fn(),
  DirectionalLight: vi.fn().mockImplementation(() => ({ position: { set: vi.fn() } })),
  GridHelper: vi.fn(),
  Box3: vi.fn().mockImplementation(() => ({ setFromObject: vi.fn().mockReturnThis(), isEmpty: vi.fn().mockReturnValue(false), getCenter: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0, copy: vi.fn() }), getSize: vi.fn().mockReturnValue({ x: 1, y: 1, z: 1 }) })),
  Vector3: vi.fn().mockImplementation(() => ({ x: 0, y: 0, z: 0, copy: vi.fn() })),
  Group: vi.fn().mockImplementation(() => ({ children: [{}], add: vi.fn() })),
  Mesh: vi.fn(), MeshPhongMaterial: vi.fn(), MeshStandardMaterial: vi.fn(),
  BufferGeometry: vi.fn().mockImplementation(() => ({ setAttribute: vi.fn(), setIndex: vi.fn(), applyMatrix4: vi.fn().mockReturnThis(), dispose: vi.fn() })),
  BufferAttribute: vi.fn(),
  Matrix4: vi.fn().mockImplementation(() => ({ fromArray: vi.fn().mockReturnThis() })),
  PMREMGenerator: vi.fn().mockImplementation(() => ({ fromScene: vi.fn().mockReturnValue({ texture: {} }), dispose: vi.fn() })),
  ACESFilmicToneMapping: 0, DoubleSide: 2, SRGBColorSpace: "srgb",
}));

vi.mock("three/examples/jsm/controls/OrbitControls.js", () => ({ OrbitControls: vi.fn().mockImplementation(() => ({ enableDamping: false, dampingFactor: 0, autoRotate: false, autoRotateSpeed: 0, target: { copy: vi.fn() }, update: vi.fn(), dispose: vi.fn() })) }));
vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({ GLTFLoader: gltfLoaderCtor.mockImplementation(() => ({ setDRACOLoader: vi.fn(), parse: vi.fn((_d: unknown, _p: string, onLoad: (r: unknown) => void) => { onLoad({ scene: { children: [{}], add: vi.fn() } }); }) })) }));
vi.mock("three/examples/jsm/loaders/DRACOLoader.js", () => ({ DRACOLoader: dracoLoaderCtor.mockImplementation(() => ({ setDecoderPath: vi.fn(), dispose: vi.fn() })) }));
vi.mock("three/examples/jsm/loaders/OBJLoader.js", () => ({ OBJLoader: objLoaderCtor.mockImplementation(() => ({ parse: vi.fn(() => ({ children: [{}], add: vi.fn() })) })) }));
vi.mock("three/examples/jsm/loaders/STLLoader.js", () => ({ STLLoader: stlLoaderCtor.mockImplementation(() => ({ parse: vi.fn(() => ({})) })) }));
vi.mock("three/examples/jsm/environments/RoomEnvironment.js", () => ({ RoomEnvironment: vi.fn() }));
vi.mock("three/examples/jsm/utils/BufferGeometryUtils.js", () => ({ mergeGeometries: vi.fn().mockReturnValue({}) }));

const MOCK_MODEL_MESHES = [{ positions: new Float32Array([0,1,2,3,4,5,6,7,8]), normals: new Float32Array([0,0,1,0,0,1,0,0,1]), indices: null }];
let lastWorkerInstance: { terminate: ReturnType<typeof vi.fn> } | null = null;

class MockWorker {
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  terminate = vi.fn();
  constructor() { lastWorkerInstance = this; }
  postMessage(msg?: unknown) {
    const data = msg && typeof msg === "object" && "format" in msg ? { type: "result", meshes: MOCK_MODEL_MESHES } : { type: "result", meshes: [] };
    setTimeout(() => { this.onmessage?.({ data }); }, 0);
  }
}

class MockIntersectionObserver {
  private _callback: (entries: Array<{ isIntersecting: boolean }>) => void;
  disconnect = vi.fn();
  unobserve = vi.fn();
  constructor(callback: (entries: Array<{ isIntersecting: boolean }>) => void) { this._callback = callback; }
  observe = vi.fn().mockImplementation(() => { setTimeout(() => this._callback([{ isIntersecting: true }]), 0); });
}

describe("ModelViewer lazy loader imports (#305, #447)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastWorkerInstance = null;
    vi.stubGlobal("Worker", MockWorker);
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    vi.stubGlobal("ResizeObserver", vi.fn().mockImplementation(() => ({ observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() })));
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  it("loads STL model via Worker without importing any loader on main thread (regression #305, #447)", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="t.stl" ext="stl" modelId={1} /></I18nProvider>);
    await waitFor(() => { expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument(); });
    expect(stlLoaderCtor).not.toHaveBeenCalled();
    expect(gltfLoaderCtor).not.toHaveBeenCalled();
    expect(objLoaderCtor).not.toHaveBeenCalled();
    expect(lastWorkerInstance).not.toBeNull();
  });

  it("loads OBJ model via Worker without importing any loader on main thread (regression #305, #447)", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="t.obj" ext="obj" modelId={1} /></I18nProvider>);
    await waitFor(() => { expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument(); });
    expect(objLoaderCtor).not.toHaveBeenCalled();
    expect(gltfLoaderCtor).not.toHaveBeenCalled();
    expect(stlLoaderCtor).not.toHaveBeenCalled();
    expect(lastWorkerInstance).not.toBeNull();
  });
});
