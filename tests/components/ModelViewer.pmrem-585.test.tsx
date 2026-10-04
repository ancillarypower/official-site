/**
 * Regression tests for PMREMGenerator failure handling (#585).
 *
 * When PMREMGenerator.fromScene() throws, the viewer must:
 *  - log a diagnostic console.warn (previously an empty catch swallowed it)
 *  - still dispose the PMREMGenerator (previously dispose() only ran on success)
 *  - fall back to directional lights and reach the ready state
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";

// Polyfill Fullscreen API for jsdom (#451)
if (!Element.prototype.requestFullscreen) {
  Element.prototype.requestFullscreen = function () { return Promise.resolve(); } as () => Promise<void>;
}
if (!document.exitFullscreen) {
  document.exitFullscreen = function () { return Promise.resolve(); } as () => Promise<void>;
}

const { fromSceneSpy, pmremDisposeSpy, gltfParseSpy } = vi.hoisted(() => ({
  fromSceneSpy: vi.fn(),
  pmremDisposeSpy: vi.fn(),
  gltfParseSpy: vi.fn(),
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
  BufferGeometry: vi.fn(),
  BufferAttribute: vi.fn(),
  Matrix4: vi.fn().mockImplementation(() => ({ fromArray: vi.fn().mockReturnThis() })),
  PMREMGenerator: vi.fn().mockImplementation(() => ({ fromScene: fromSceneSpy, dispose: pmremDisposeSpy })),
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
vi.mock("three/examples/jsm/utils/BufferGeometryUtils.js", () => ({ mergeGeometries: vi.fn() }));

describe("ModelViewer PMREMGenerator failure handling (#585)", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("ResizeObserver", vi.fn().mockImplementation(() => ({ observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() })));
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    // GLTF parses successfully so the viewer can reach the ready state
    gltfParseSpy.mockImplementation((_d: unknown, _p: string, onLoad: (r: unknown) => void) => {
      onLoad({ scene: { children: [{}], add: vi.fn() } });
    });
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("logs a [ModelViewer] console.warn with the original error when fromScene throws", async () => {
    const pmremError = new Error("PMREM out of memory");
    fromSceneSpy.mockImplementation(() => { throw pmremError; });
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="ok.glb" ext="glb" modelId={1} /></I18nProvider>);
    await waitFor(() => { expect(fromSceneSpy).toHaveBeenCalled(); });
    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("[ModelViewer]"), pmremError);
    });
  });

  it("disposes the PMREMGenerator even when fromScene throws", async () => {
    fromSceneSpy.mockImplementation(() => { throw new Error("PMREM failed"); });
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="ok.glb" ext="glb" modelId={1} /></I18nProvider>);
    await waitFor(() => { expect(fromSceneSpy).toHaveBeenCalled(); });
    await waitFor(() => { expect(pmremDisposeSpy).toHaveBeenCalledTimes(1); });
  });

  it("falls back to directional lights and still reaches the ready state when fromScene throws", async () => {
    fromSceneSpy.mockImplementation(() => { throw new Error("PMREM failed"); });
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="ok.glb" ext="glb" modelId={1} /></I18nProvider>);
    // Ready state renders the reset-viewpoint button; error state renders none
    await waitFor(() => { expect(screen.getAllByRole("button").length).toBeGreaterThan(0); });
    expect(screen.queryByText(/PMREM failed/)).not.toBeInTheDocument();
  });

  it("disposes once and does not warn on the success path", async () => {
    fromSceneSpy.mockReturnValue({ texture: {} });
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="ok.glb" ext="glb" modelId={1} /></I18nProvider>);
    await waitFor(() => { expect(screen.getAllByRole("button").length).toBeGreaterThan(0); });
    expect(pmremDisposeSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining("[ModelViewer] PMREMGenerator"), expect.anything());
  });
});
