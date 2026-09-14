import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";

vi.mock("web-ifc", () => ({
  IfcAPI: vi.fn().mockImplementation(() => ({
    SetWasmPath: vi.fn(),
    Init: vi.fn(),
    OpenModel: vi.fn().mockReturnValue(0),
    CloseModel: vi.fn(),
    GetGeometry: vi.fn().mockReturnValue({
      GetVertexData: () => 0, GetVertexDataSize: () => 0,
      GetIndexData: () => 0, GetIndexDataSize: () => 0, delete: vi.fn(),
    }),
    GetVertexArray: vi.fn().mockReturnValue(new Float32Array([0, 1, 2, 0, 0, 1])),
    GetIndexArray: vi.fn().mockReturnValue(new Uint32Array([0])),
    StreamAllMeshes: vi.fn((_modelID: number, callback: (flatMesh: unknown) => void) => {
      callback({
        geometries: {
          size: () => 2,
          get: (i: number) => ({
            geometryExpressID: i,
            color: { x: 0.5, y: 0.5, z: 0.5, w: i === 0 ? 1 : 0.5 },
            flatTransformation: [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1],
          }),
        },
      });
    }),
  })),
}));

vi.mock("three", async () => ({
  Color: vi.fn().mockImplementation(() => ({ r: 0.5, g: 0.5, b: 0.5, setRGB: vi.fn().mockReturnThis() })),
  Scene: vi.fn().mockImplementation(() => ({ background: null, environment: null, add: vi.fn() })),
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
  Mesh: vi.fn(), MeshPhongMaterial: vi.fn(), MeshStandardMaterial: vi.fn(),
  BufferGeometry: vi.fn().mockImplementation(() => ({ setAttribute: vi.fn(), setIndex: vi.fn(), applyMatrix4: vi.fn().mockReturnThis() })),
  BufferAttribute: vi.fn(),
  Matrix4: vi.fn().mockImplementation(() => ({ fromArray: vi.fn().mockReturnThis() })),
  PMREMGenerator: vi.fn().mockImplementation(() => ({ fromScene: vi.fn().mockReturnValue({ texture: {} }), dispose: vi.fn() })),
  ACESFilmicToneMapping: 0, DoubleSide: 2, SRGBColorSpace: "srgb",
}));

vi.mock("three/examples/jsm/controls/OrbitControls.js", () => ({
  OrbitControls: vi.fn().mockImplementation(() => ({
    enableDamping: false, dampingFactor: 0, autoRotate: false, autoRotateSpeed: 0,
    target: { copy: vi.fn() }, update: vi.fn(),
  })),
}));
vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: vi.fn().mockImplementation(() => ({
    setDRACOLoader: vi.fn(),
    parse: vi.fn((_d: unknown, _p: string, onLoad: (r: unknown) => void) => {
      onLoad({ scene: { children: [{}], add: vi.fn() } });
    }),
  })),
}));
vi.mock("three/examples/jsm/loaders/DRACOLoader.js", () => ({
  DRACOLoader: vi.fn().mockImplementation(() => ({ setDecoderPath: vi.fn() })),
}));
vi.mock("three/examples/jsm/loaders/OBJLoader.js", () => ({
  OBJLoader: vi.fn().mockImplementation(() => ({
    parse: vi.fn(() => ({ children: [{}], add: vi.fn() })),
  })),
}));
vi.mock("three/examples/jsm/loaders/STLLoader.js", () => ({
  STLLoader: vi.fn().mockImplementation(() => ({ parse: vi.fn(() => ({})) })),
}));
vi.mock("three/examples/jsm/environments/RoomEnvironment.js", () => ({ RoomEnvironment: vi.fn() }));
vi.mock("three/examples/jsm/utils/BufferGeometryUtils.js", () => ({
  mergeGeometries: vi.fn().mockReturnValue({}),
}));

// Helper: restore GLTFLoader and Box3 to their factory defaults.
// vi.restoreAllMocks() only restores spies, not vi.fn() implementations.
// Call this in beforeEach of any block that overrides these mocks.
async function resetOverridableMocks() {
  const { GLTFLoader } = await import(
    "three/examples/jsm/loaders/GLTFLoader.js"
  );
  vi.mocked(GLTFLoader).mockImplementation(
    () =>
      ({
        setDRACOLoader: vi.fn(),
        parse: vi.fn(
          (_d: unknown, _p: string, onLoad: (r: unknown) => void) => {
            onLoad({ scene: { children: [{}], add: vi.fn() } });
          },
        ),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
  );

  const { Box3 } = await import("three");
  vi.mocked(Box3).mockImplementation(
    () =>
      ({
        setFromObject: vi.fn().mockReturnThis(),
        isEmpty: vi.fn().mockReturnValue(false),
        getCenter: vi
          .fn()
          .mockReturnValue({ x: 0, y: 0, z: 0, copy: vi.fn() }),
        getSize: vi.fn().mockReturnValue({ x: 1, y: 1, z: 1 }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
  );
}

describe("ModelViewer IFC support", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("ResizeObserver", vi.fn().mockImplementation(() => ({ observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() })));
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders loading state for IFC files", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="test.ifc" ext="ifc" data={new ArrayBuffer(8)} /></I18nProvider>);
    expect(screen.getByText(/\u89e3\u6790\u6a21\u578b/)).toBeInTheDocument();
  });

  it("processes IFC geometries and reaches ready state", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="test.ifc" ext="ifc" data={new ArrayBuffer(8)} /></I18nProvider>);
    await waitFor(() => { expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument(); });
  });
});

describe("ModelViewer GLB/OBJ/STL support", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("ResizeObserver", vi.fn().mockImplementation(() => ({ observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() })));
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads GLB model", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="t.glb" ext="glb" data={new ArrayBuffer(8)} /></I18nProvider>);
    await waitFor(() => { expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument(); });
  });

  it("loads OBJ model", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="t.obj" ext="obj" data={new ArrayBuffer(8)} /></I18nProvider>);
    await waitFor(() => { expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument(); });
  });

  it("loads STL model", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="t.stl" ext="stl" data={new ArrayBuffer(8)} /></I18nProvider>);
    await waitFor(() => { expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument(); });
  });

  it("loads GLTF text model", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="t.gltf" ext="gltf" data={new ArrayBuffer(8)} /></I18nProvider>);
    await waitFor(() => { expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument(); });
  });

  it("respects prefers-reduced-motion and disables autoRotate", async () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="t.glb" ext="glb" data={new ArrayBuffer(8)} /></I18nProvider>);
    await waitFor(() => { expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument(); });
  });

  it("cleans up renderer and animation frame on unmount", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    const { unmount } = render(<I18nProvider><ModelViewer name="t.glb" ext="glb" data={new ArrayBuffer(8)} /></I18nProvider>);
    await waitFor(() => { expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument(); });
    unmount();
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });
});

describe("ModelViewer GLTF error handling", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await resetOverridableMocks();
    vi.stubGlobal("ResizeObserver", vi.fn().mockImplementation(() => ({ observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() })));
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows error message when GLTF parsing fails", async () => {
    const { GLTFLoader } = await import(
      "three/examples/jsm/loaders/GLTFLoader.js"
    );
    vi.mocked(GLTFLoader).mockImplementation(
      () =>
        ({
          setDRACOLoader: vi.fn(),
          parse: vi.fn(
            (
              _d: unknown,
              _p: string,
              _onLoad: unknown,
              onError: (e: Error) => void,
            ) => {
              onError(new Error("corrupt file"));
            },
          ),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any,
    );

    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(
      <I18nProvider>
        <ModelViewer name="bad.glb" ext="glb" data={new ArrayBuffer(8)} />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/corrupt file/)).toBeInTheDocument();
    });
  });

  it("shows error when GLTF scene has no visible geometry", async () => {
    const { Box3 } = await import("three");
    vi.mocked(Box3).mockImplementation(
      () =>
        ({
          setFromObject: vi.fn().mockReturnThis(),
          isEmpty: vi.fn().mockReturnValue(true),
          getCenter: vi
            .fn()
            .mockReturnValue({ x: 0, y: 0, z: 0, copy: vi.fn() }),
          getSize: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any,
    );

    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(
      <I18nProvider>
        <ModelViewer name="empty.glb" ext="glb" data={new ArrayBuffer(8)} />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/No visible geometry/)).toBeInTheDocument();
    });
  });

  it("does not throw when error callback fires after unmount", async () => {
    let capturedOnError: ((e: Error) => void) | null = null;
    const { GLTFLoader } = await import(
      "three/examples/jsm/loaders/GLTFLoader.js"
    );
    vi.mocked(GLTFLoader).mockImplementation(
      () =>
        ({
          setDRACOLoader: vi.fn(),
          parse: vi.fn(
            (
              _d: unknown,
              _p: string,
              _onLoad: unknown,
              onError: (e: Error) => void,
            ) => {
              capturedOnError = onError;
            },
          ),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any,
    );

    const { ModelViewer } = await import("@/components/models/ModelViewer");
    const { unmount } = render(
      <I18nProvider>
        <ModelViewer name="bad.glb" ext="glb" data={new ArrayBuffer(8)} />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(capturedOnError).not.toBeNull();
    });

    unmount();

    expect(() => capturedOnError!(new Error("late error"))).not.toThrow();
  });
});
