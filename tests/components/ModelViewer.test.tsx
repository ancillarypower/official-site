import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";

vi.mock("@/hooks/useModelDB", () => ({
  getModelData: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
}));

const mockCloseModel = vi.fn();

vi.mock("web-ifc", () => ({
  IfcAPI: vi.fn().mockImplementation(() => ({
    SetWasmPath: vi.fn(),
    Init: vi.fn(),
    OpenModel: vi.fn().mockReturnValue(0),
    CloseModel: mockCloseModel,
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

const mockTraverse = vi.fn();
const mockControlsDispose = vi.fn();
const mockCameraPositionSet = vi.fn();
const mockControlsTargetCopy = vi.fn();
const mockUpdateProjectionMatrix = vi.fn();
const mockControlsUpdate = vi.fn();
const mockDracoDispose = vi.fn();
const mockRendererSetSize = vi.fn();

vi.mock("three", async () => ({
  Color: vi.fn().mockImplementation(() => ({ r: 0.5, g: 0.5, b: 0.5, setRGB: vi.fn().mockReturnThis() })),
  Scene: vi.fn().mockImplementation(() => ({
    background: null, environment: null, add: vi.fn(),
    traverse: mockTraverse,
  })),
  PerspectiveCamera: vi.fn().mockImplementation(() => ({
    position: { set: mockCameraPositionSet }, aspect: 1, near: 0.01, far: 1000, updateProjectionMatrix: mockUpdateProjectionMatrix,
  })),
  WebGLRenderer: vi.fn().mockImplementation(() => {
    const canvas = document.createElement("canvas");
    return {
      setSize: mockRendererSetSize, setPixelRatio: vi.fn(), toneMapping: 0, toneMappingExposure: 1,
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
  BufferGeometry: vi.fn().mockImplementation(() => ({ setAttribute: vi.fn(), setIndex: vi.fn(), applyMatrix4: vi.fn().mockReturnThis(), dispose: vi.fn() })),
  BufferAttribute: vi.fn(),
  Matrix4: vi.fn().mockImplementation(() => ({ fromArray: vi.fn().mockReturnThis() })),
  PMREMGenerator: vi.fn().mockImplementation(() => ({ fromScene: vi.fn().mockReturnValue({ texture: {} }), dispose: vi.fn() })),
  ACESFilmicToneMapping: 0, DoubleSide: 2, SRGBColorSpace: "srgb",
}));

vi.mock("three/examples/jsm/controls/OrbitControls.js", () => ({
  OrbitControls: vi.fn().mockImplementation(() => ({
    enableDamping: false, dampingFactor: 0, autoRotate: false, autoRotateSpeed: 0,
    target: { copy: mockControlsTargetCopy }, update: mockControlsUpdate, dispose: mockControlsDispose,
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
  DRACOLoader: vi.fn().mockImplementation(() => ({ setDecoderPath: vi.fn(), dispose: mockDracoDispose })),
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

describe("ModelViewer IFC support", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("ResizeObserver", vi.fn().mockImplementation(() => ({ observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() })));
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  it("renders loading state for IFC files", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="test.ifc" ext="ifc" modelId={1} /></I18nProvider>);
    expect(screen.getByText(/\u89e3\u6790\u6a21\u578b/)).toBeInTheDocument();
  });

  it("processes IFC geometries and reaches ready state", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="test.ifc" ext="ifc" modelId={1} /></I18nProvider>);
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

  it("loads GLB model", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="t.glb" ext="glb" modelId={1} /></I18nProvider>);
    await waitFor(() => { expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument(); });
  });

  it("loads OBJ model", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="t.obj" ext="obj" modelId={1} /></I18nProvider>);
    await waitFor(() => { expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument(); });
  });

  it("loads STL model", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="t.stl" ext="stl" modelId={1} /></I18nProvider>);
    await waitFor(() => { expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument(); });
  });

  it("loads GLTF text model", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="t.gltf" ext="gltf" modelId={1} /></I18nProvider>);
    await waitFor(() => { expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument(); });
  });

  it("respects prefers-reduced-motion and disables autoRotate", async () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="t.glb" ext="glb" modelId={1} /></I18nProvider>);
    await waitFor(() => { expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument(); });
  });

  it("cleans up renderer and animation frame on unmount", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    const { unmount } = render(<I18nProvider><ModelViewer name="t.glb" ext="glb" modelId={1} /></I18nProvider>);
    await waitFor(() => { expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument(); });
    unmount();
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });
});

describe("ModelViewer GPU resource cleanup (#74)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("ResizeObserver", vi.fn().mockImplementation(() => ({ observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() })));
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  it("traverses scene to dispose GPU resources on unmount", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    const { unmount } = render(
      <I18nProvider><ModelViewer name="t.glb" ext="glb" modelId={1} /></I18nProvider>,
    );
    await waitFor(() => {
      expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument();
    });

    unmount();
    expect(mockTraverse).toHaveBeenCalled();
  });

  it("disposes OrbitControls on unmount", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    const { unmount } = render(
      <I18nProvider><ModelViewer name="t.glb" ext="glb" modelId={1} /></I18nProvider>,
    );
    await waitFor(() => {
      expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument();
    });

    unmount();
    expect(mockControlsDispose).toHaveBeenCalled();
  });
});

describe("ModelViewer DRACOLoader cleanup (#105)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("ResizeObserver", vi.fn().mockImplementation(() => ({ observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() })));
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  it("disposes DRACOLoader on unmount when loading GLB", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    const { unmount } = render(
      <I18nProvider><ModelViewer name="t.glb" ext="glb" modelId={1} /></I18nProvider>,
    );
    await waitFor(() => {
      expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument();
    });

    unmount();
    expect(mockDracoDispose).toHaveBeenCalled();
  });
});

describe("ModelViewer WebGL context loss recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("ResizeObserver", vi.fn().mockImplementation(() => ({ observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() })));
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  it("shows GPU error and stops animation when WebGL context is lost", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    const { container } = render(
      <I18nProvider><ModelViewer name="t.glb" ext="glb" modelId={1} /></I18nProvider>,
    );
    await waitFor(() => {
      expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument();
    });

    const canvas = container.querySelector("canvas")!;
    const event = new Event("webglcontextlost", { cancelable: true });
    canvas.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(cancelAnimationFrame).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText(/GPU/)).toBeInTheDocument();
    });
  });

  it("does not throw when context lost fires after unmount", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    const { container, unmount } = render(
      <I18nProvider><ModelViewer name="t.glb" ext="glb" modelId={1} /></I18nProvider>,
    );
    await waitFor(() => {
      expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument();
    });

    const canvas = container.querySelector("canvas")!;
    unmount();

    expect(() => {
      canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
    }).not.toThrow();
  });
});

describe("ModelViewer viewpoint reset (#336)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("ResizeObserver", vi.fn().mockImplementation(() => ({ observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() })));
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  it("renders reset viewpoint button when model is ready", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="t.glb" ext="glb" modelId={1} /></I18nProvider>);
    await waitFor(() => {
      expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument();
    });
    expect(screen.getByLabelText(/\u91cd\u8a2d\u8996\u89d2/)).toBeInTheDocument();
  });

  it("calls camera.position.set again on reset button click", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="t.glb" ext="glb" modelId={1} /></I18nProvider>);
    await waitFor(() => {
      expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument();
    });

    const callsBefore = mockCameraPositionSet.mock.calls.length;
    const resetBtn = screen.getByLabelText(/\u91cd\u8a2d\u8996\u89d2/);
    resetBtn.click();
    expect(mockCameraPositionSet.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});

describe("ModelViewer font scale resize (#110)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("ResizeObserver", vi.fn().mockImplementation(() => ({ observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() })));
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  it("resizes renderer on fontscalechange event", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="t.glb" ext="glb" modelId={1} /></I18nProvider>);
    await waitFor(() => {
      expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument();
    });

    // Clear call history from init setSize calls
    mockRendererSetSize.mockClear();
    mockUpdateProjectionMatrix.mockClear();

    // Dispatch fontscalechange event
    window.dispatchEvent(new CustomEvent("fontscalechange"));

    expect(mockRendererSetSize).toHaveBeenCalledTimes(1);
    expect(mockUpdateProjectionMatrix).toHaveBeenCalledTimes(1);
  });
});

describe("ModelViewer IFC WASM heap cleanup (#173)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("ResizeObserver", vi.fn().mockImplementation(() => ({ observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() })));
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  it("calls CloseModel exactly once during normal IFC processing and does not re-call on unmount (regression #173)", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    const { unmount } = render(
      <I18nProvider><ModelViewer name="test.ifc" ext="ifc" modelId={1} /></I18nProvider>,
    );
    await waitFor(() => {
      expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument();
    });

    // Normal flow: CloseModel called once after StreamAllMeshes
    const callsAfterRender = mockCloseModel.mock.calls.length;
    expect(callsAfterRender).toBe(1);

    // Unmount: cleanup should NOT re-call CloseModel because
    // ifcApiRef was nulled after normal CloseModel
    unmount();
    expect(mockCloseModel.mock.calls.length).toBe(1);
  });
});

describe("ModelViewer IFC per-mesh error handling (#190)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("ResizeObserver", vi.fn().mockImplementation(() => ({ observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() })));
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  it("skips corrupted mesh and continues processing remaining meshes (regression #190)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Override IfcAPI constructor for this render: GetGeometry throws on first call
    const WebIFC = await import("web-ifc");
    let getGeomCallCount = 0;
    vi.mocked(WebIFC.IfcAPI).mockImplementationOnce(() => ({
      SetWasmPath: vi.fn(),
      Init: vi.fn(),
      OpenModel: vi.fn().mockReturnValue(0),
      CloseModel: vi.fn(),
      GetGeometry: vi.fn().mockImplementation(() => {
        getGeomCallCount++;
        if (getGeomCallCount === 1) throw new Error("Corrupted mesh data");
        return {
          GetVertexData: () => 0, GetVertexDataSize: () => 0,
          GetIndexData: () => 0, GetIndexDataSize: () => 0, delete: vi.fn(),
        };
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
    }) as unknown);

    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="test.ifc" ext="ifc" modelId={1} /></I18nProvider>);

    // Component should still reach ready state (second mesh processed successfully)
    await waitFor(() => {
      expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument();
    });

    // console.warn should have been called for the corrupted mesh
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[IFC]"),
      expect.any(Error),
    );

    warnSpy.mockRestore();
  });
});

describe("ModelViewer IFC BufferGeometry dispose (#193)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("ResizeObserver", vi.fn().mockImplementation(() => ({ observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() })));
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  it("disposes source BufferGeometry instances after mergeGeometries (regression #193)", async () => {
    const THREE = await import("three");
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="test.ifc" ext="ifc" modelId={1} /></I18nProvider>);
    await waitFor(() => {
      expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument();
    });

    // StreamAllMeshes mock produces 2 meshes (1 opaque w=1 + 1 transparent w=0.5),
    // each creates a BufferGeometry that should be disposed after mergeGeometries
    const bgInstances = vi.mocked(THREE.BufferGeometry).mock.results
      .filter((r) => r.type === "return")
      .map((r) => r.value as { dispose: ReturnType<typeof vi.fn> });
    expect(bgInstances.length).toBe(2);
    for (const geom of bgInstances) {
      expect(geom.dispose).toHaveBeenCalledTimes(1);
    }
  });
});
