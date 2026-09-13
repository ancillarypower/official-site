import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";

// Stub all heavy dependencies to avoid WebGL/WASM in jsdom
vi.mock("web-ifc", () => ({
  IfcAPI: vi.fn().mockImplementation(() => ({
    SetWasmPath: vi.fn(),
    Init: vi.fn(),
    OpenModel: vi.fn().mockReturnValue(0),
    CloseModel: vi.fn(),
    GetGeometry: vi.fn().mockReturnValue({
      GetVertexData: () => 0,
      GetVertexDataSize: () => 0,
      GetIndexData: () => 0,
      GetIndexDataSize: () => 0,
      delete: vi.fn(),
    }),
    GetVertexArray: vi.fn().mockReturnValue(new Float32Array([0, 1, 2, 0, 0, 1])),
    GetIndexArray: vi.fn().mockReturnValue(new Uint32Array([0])),
    StreamAllMeshes: vi.fn(),
  })),
}));

vi.mock("three", async () => ({
  Color: vi.fn().mockImplementation(() => ({ r: 0.5, g: 0.5, b: 0.5, setRGB: vi.fn().mockReturnThis() })),
  Scene: vi.fn().mockImplementation(() => ({ background: null, environment: null, add: vi.fn() })),
  PerspectiveCamera: vi.fn().mockImplementation(() => ({
    position: { set: vi.fn() }, aspect: 1, near: 0.01, far: 1000, updateProjectionMatrix: vi.fn(),
  })),
  WebGLRenderer: vi.fn().mockImplementation(() => ({
    setSize: vi.fn(), setPixelRatio: vi.fn(), toneMapping: 0, toneMappingExposure: 1,
    domElement: { parentNode: { removeChild: vi.fn() } }, render: vi.fn(), dispose: vi.fn(),
  })),
  AmbientLight: vi.fn(),
  DirectionalLight: vi.fn().mockImplementation(() => ({ position: { set: vi.fn() } })),
  GridHelper: vi.fn(),
  Box3: vi.fn().mockImplementation(() => ({
    setFromObject: vi.fn().mockReturnThis(), isEmpty: vi.fn().mockReturnValue(false),
    getCenter: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0, copy: vi.fn() }),
    getSize: vi.fn().mockReturnValue({ x: 1, y: 1, z: 1 }),
  })),
  Vector3: vi.fn().mockImplementation(() => ({ x: 0, y: 0, z: 0, copy: vi.fn() })),
  Group: vi.fn().mockImplementation(() => ({
    children: [{}], add: vi.fn(),
  })),
  Mesh: vi.fn(), MeshPhongMaterial: vi.fn(), MeshStandardMaterial: vi.fn(),
  BufferGeometry: vi.fn().mockImplementation(() => ({
    setAttribute: vi.fn(), setIndex: vi.fn(), applyMatrix4: vi.fn().mockReturnThis(),
  })),
  BufferAttribute: vi.fn(),
  Matrix4: vi.fn().mockImplementation(() => ({ fromArray: vi.fn().mockReturnThis() })),
  PMREMGenerator: vi.fn().mockImplementation(() => ({
    fromScene: vi.fn().mockReturnValue({ texture: {} }), dispose: vi.fn(),
  })),
  ACESFilmicToneMapping: 0, DoubleSide: 2, SRGBColorSpace: "srgb",
}));

vi.mock("three/examples/jsm/controls/OrbitControls.js", () => ({
  OrbitControls: vi.fn().mockImplementation(() => ({
    enableDamping: false, dampingFactor: 0, autoRotate: false, autoRotateSpeed: 0,
    target: { copy: vi.fn() }, update: vi.fn(),
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

describe("ModelViewer IFC support", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("ResizeObserver", vi.fn().mockImplementation(() => ({
      observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn(),
    })));
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  it("renders loading state for IFC files", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(
      <I18nProvider>
        <ModelViewer name="test.ifc" ext="ifc" data={new ArrayBuffer(8)} />
      </I18nProvider>,
    );
    expect(screen.getByText(/\u89e3\u6790\u6a21\u578b/)).toBeInTheDocument();
  });
});
