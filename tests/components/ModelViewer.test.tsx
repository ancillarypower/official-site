import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";

// Mock all heavy three.js and web-ifc imports
const mockSetWasmPath = vi.fn();
const mockInit = vi.fn();
const mockOpenModel = vi.fn().mockReturnValue(0);
const mockCloseModel = vi.fn();
const mockGetGeometry = vi.fn().mockReturnValue({
  GetVertexData: () => 0,
  GetVertexDataSize: () => 0,
  GetIndexData: () => 0,
  GetIndexDataSize: () => 0,
  delete: vi.fn(),
});
const mockGetVertexArray = vi.fn().mockReturnValue(new Float32Array([0, 1, 2, 0, 0, 1]));
const mockGetIndexArray = vi.fn().mockReturnValue(new Uint32Array([0]));
const mockStreamAllMeshes = vi.fn();

vi.mock("web-ifc", () => ({
  IfcAPI: vi.fn().mockImplementation(() => ({
    SetWasmPath: mockSetWasmPath,
    Init: mockInit,
    OpenModel: mockOpenModel,
    CloseModel: mockCloseModel,
    GetGeometry: mockGetGeometry,
    GetVertexArray: mockGetVertexArray,
    GetIndexArray: mockGetIndexArray,
    StreamAllMeshes: mockStreamAllMeshes,
  })),
}));

// Mock three.js to avoid WebGL in jsdom
const mockDispose = vi.fn();
const mockSetSize = vi.fn();
const mockRender = vi.fn();
const mockAppendChild = vi.fn();

vi.mock("three", async () => {
  const actual: Record<string, unknown> = {};
  return {
    ...actual,
    Color: vi.fn().mockImplementation(() => ({ r: 0.5, g: 0.5, b: 0.5, setRGB: vi.fn().mockReturnThis() })),
    Scene: vi.fn().mockImplementation(() => ({ background: null, environment: null, add: vi.fn() })),
    PerspectiveCamera: vi.fn().mockImplementation(() => ({
      position: { set: vi.fn() },
      aspect: 1,
      near: 0.01,
      far: 1000,
      updateProjectionMatrix: vi.fn(),
    })),
    WebGLRenderer: vi.fn().mockImplementation(() => ({
      setSize: mockSetSize,
      setPixelRatio: vi.fn(),
      toneMapping: 0,
      toneMappingExposure: 1,
      domElement: { parentNode: { removeChild: vi.fn() } },
      render: mockRender,
      dispose: mockDispose,
    })),
    AmbientLight: vi.fn(),
    DirectionalLight: vi.fn().mockImplementation(() => ({ position: { set: vi.fn() } })),
    GridHelper: vi.fn(),
    Box3: vi.fn().mockImplementation(() => ({
      setFromObject: vi.fn().mockReturnThis(),
      isEmpty: vi.fn().mockReturnValue(false),
      getCenter: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0, copy: vi.fn() }),
      getSize: vi.fn().mockReturnValue({ x: 1, y: 1, z: 1 }),
    })),
    Vector3: vi.fn().mockImplementation(() => ({ x: 0, y: 0, z: 0, copy: vi.fn() })),
    Group: vi.fn().mockImplementation(() => ({ children: [{}], add: vi.fn().mockImplementation(function(this: { children: unknown[] }, c: unknown) { this.children.push(c); }) })),
    Mesh: vi.fn().mockImplementation(() => ({})),
    MeshPhongMaterial: vi.fn(),
    MeshStandardMaterial: vi.fn(),
    BufferGeometry: vi.fn().mockImplementation(() => ({
      setAttribute: vi.fn(),
      setIndex: vi.fn(),
      applyMatrix4: vi.fn().mockReturnThis(),
    })),
    BufferAttribute: vi.fn(),
    Matrix4: vi.fn().mockImplementation(() => ({ fromArray: vi.fn().mockReturnThis() })),
    PMREMGenerator: vi.fn().mockImplementation(() => ({
      fromScene: vi.fn().mockReturnValue({ texture: {} }),
      dispose: vi.fn(),
    })),
    ACESFilmicToneMapping: 0,
    DoubleSide: 2,
    SRGBColorSpace: "srgb",
  };
});

vi.mock("three/examples/jsm/controls/OrbitControls.js", () => ({
  OrbitControls: vi.fn().mockImplementation(() => ({
    enableDamping: false,
    dampingFactor: 0,
    autoRotate: false,
    autoRotateSpeed: 0,
    target: { copy: vi.fn() },
    update: vi.fn(),
  })),
}));

vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({ GLTFLoader: vi.fn() }));
vi.mock("three/examples/jsm/loaders/DRACOLoader.js", () => ({ DRACOLoader: vi.fn() }));
vi.mock("three/examples/jsm/loaders/OBJLoader.js", () => ({ OBJLoader: vi.fn() }));
vi.mock("three/examples/jsm/loaders/STLLoader.js", () => ({ STLLoader: vi.fn() }));
vi.mock("three/examples/jsm/environments/RoomEnvironment.js", () => ({ RoomEnvironment: vi.fn() }));
vi.mock("three/examples/jsm/utils/BufferGeometryUtils.js", () => ({
  mergeGeometries: vi.fn().mockReturnValue({}),
}));

describe("ModelViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock ResizeObserver
    vi.stubGlobal("ResizeObserver", vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
      unobserve: vi.fn(),
    })));
    // Mock matchMedia
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    // Mock requestAnimationFrame
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  it("renders loading state initially for IFC files", async () => {
    // Dynamically import after mocks are set up
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    const data = new ArrayBuffer(8);
    render(
      <I18nProvider>
        <ModelViewer name="test.ifc" ext="ifc" data={data} />
      </I18nProvider>,
    );
    expect(screen.getByText(/解析模型中/)).toBeInTheDocument();
  });

  it("calls web-ifc API with correct initialization order for IFC files", async () => {
    // Simulate StreamAllMeshes calling callback with one mesh
    mockStreamAllMeshes.mockImplementation((_modelID: number, callback: (mesh: { geometries: { size: () => number; get: (i: number) => { geometryExpressID: number; color: { x: number; y: number; z: number; w: number }; flatTransformation: number[] } } }) => void) => {
      callback({
        geometries: {
          size: () => 1,
          get: () => ({
            geometryExpressID: 1,
            color: { x: 1, y: 0, z: 0, w: 1 },
            flatTransformation: [
              1, 0, 0, 0,
              0, 1, 0, 0,
              0, 0, 1, 0,
              0, 0, 0, 1,
            ],
          }),
        },
      });
    });

    const { ModelViewer } = await import("@/components/models/ModelViewer");
    const data = new ArrayBuffer(8);
    render(
      <I18nProvider>
        <ModelViewer name="building.ifc" ext="ifc" data={data} />
      </I18nProvider>,
    );

    // Wait for async init
    await vi.waitFor(() => {
      expect(mockSetWasmPath).toHaveBeenCalledWith(
        "https://cdn.jsdelivr.net/npm/web-ifc@0.0.77/",
        true,
      );
    });

    // Verify correct order: SetWasmPath before Init
    const setWasmOrder = mockSetWasmPath.mock.invocationCallOrder[0];
    const initOrder = mockInit.mock.invocationCallOrder[0];
    expect(setWasmOrder).toBeLessThan(initOrder!);

    // Verify CloseModel is called after streaming
    expect(mockCloseModel).toHaveBeenCalledWith(0);
  });

  it("releases WASM heap memory via geometry.delete()", async () => {
    const mockDelete = vi.fn();
    mockGetGeometry.mockReturnValue({
      GetVertexData: () => 0,
      GetVertexDataSize: () => 0,
      GetIndexData: () => 0,
      GetIndexDataSize: () => 0,
      delete: mockDelete,
    });

    mockStreamAllMeshes.mockImplementation((_modelID: number, callback: (mesh: { geometries: { size: () => number; get: (i: number) => { geometryExpressID: number; color: { x: number; y: number; z: number; w: number }; flatTransformation: number[] } } }) => void) => {
      callback({
        geometries: {
          size: () => 1,
          get: () => ({
            geometryExpressID: 42,
            color: { x: 0.5, y: 0.5, z: 0.5, w: 1 },
            flatTransformation: [
              1, 0, 0, 0,
              0, 1, 0, 0,
              0, 0, 1, 0,
              0, 0, 0, 1,
            ],
          }),
        },
      });
    });

    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(
      <I18nProvider>
        <ModelViewer name="test.ifc" ext="ifc" data={new ArrayBuffer(8)} />
      </I18nProvider>,
    );

    await vi.waitFor(() => {
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
