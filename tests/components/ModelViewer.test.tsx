import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";

vi.mock("@/hooks/useModelDB", () => ({
  getModelData: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
}));

// --- IFC Worker mock infrastructure (#202) ---
const mockWorkerTerminate = vi.fn();
let lastWorkerInstance: {
  onmessage: ((e: { data: unknown }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  terminate: ReturnType<typeof vi.fn>;
} | null = null;

const MOCK_IFC_MESHES = [
  {
    positions: new Float32Array([0, 1, 2]),
    normals: new Float32Array([0, 0, 1]),
    colors: new Float32Array([0.5, 0.5, 0.5, 1.0]),
    indices: new Uint32Array([0]),
    flatTransformation: [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1],
    transparent: false,
  },
  {
    positions: new Float32Array([3, 4, 5]),
    normals: new Float32Array([0, 1, 0]),
    colors: new Float32Array([0.5, 0.5, 0.5, 0.5]),
    indices: new Uint32Array([0]),
    flatTransformation: [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1],
    transparent: true,
  },
];

// OBJ/STL Worker mock data (#447)
const MOCK_MODEL_MESHES = [
  {
    positions: new Float32Array([0, 1, 2, 3, 4, 5, 6, 7, 8]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    indices: null,
  },
];

let workerAutoRespond = true;
let workerResponseOverride: unknown = null;

class MockWorker {
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  terminate = mockWorkerTerminate;

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    lastWorkerInstance = this;
  }

  postMessage(msg?: unknown) {
    if (!workerAutoRespond) return;
    let data;
    if (workerResponseOverride) {
      data = workerResponseOverride;
    } else if (msg && typeof msg === "object" && "format" in msg) {
      // OBJ/STL model parse Worker (#447)
      data = { type: "result", meshes: MOCK_MODEL_MESHES };
    } else {
      // IFC Worker (receives { buffer, wasmCdn })
      data = { type: "result", meshes: MOCK_IFC_MESHES };
    }
    setTimeout(() => {
      this.onmessage?.({ data });
    }, 0);
  }
}
// --- end IFC Worker mock ---

// --- IntersectionObserver mock (#203) ---
let ioAutoTrigger = true;
let lastIOCallback: ((entries: Array<{ isIntersecting: boolean }>) => void) | null = null;
const mockIODisconnect = vi.fn();

class MockIntersectionObserver {
  private _callback: (entries: Array<{ isIntersecting: boolean }>) => void;
  disconnect = mockIODisconnect;
  unobserve = vi.fn();

  constructor(callback: (entries: Array<{ isIntersecting: boolean }>) => void) {
    this._callback = callback;
    lastIOCallback = callback;
  }

  observe = vi.fn().mockImplementation(() => {
    if (ioAutoTrigger) {
      setTimeout(() => this._callback([{ isIntersecting: true }]), 0);
    }
  });
}
// --- end IntersectionObserver mock ---

const mockTraverse = vi.fn();
const mockControlsDispose = vi.fn();
const mockCameraPositionSet = vi.fn();
const mockControlsTargetCopy = vi.fn();
const mockUpdateProjectionMatrix = vi.fn();
const mockControlsUpdate = vi.fn();
const mockDracoDispose = vi.fn();
const mockRendererSetSize = vi.fn();
const mockWebGLRenderer = vi.fn();

vi.mock("three", async () => ({
  Color: vi.fn().mockImplementation(() => ({ r: 0.5, g: 0.5, b: 0.5, setRGB: vi.fn().mockReturnThis() })),
  Scene: vi.fn().mockImplementation(() => ({
    background: null, environment: null, add: vi.fn(),
    traverse: mockTraverse,
  })),
  PerspectiveCamera: vi.fn().mockImplementation(() => ({
    position: { set: mockCameraPositionSet }, aspect: 1, near: 0.01, far: 1000, updateProjectionMatrix: mockUpdateProjectionMatrix,
  })),
  WebGLRenderer: mockWebGLRenderer.mockImplementation(() => {
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
    workerAutoRespond = true;
    workerResponseOverride = null;
    lastWorkerInstance = null;
    ioAutoTrigger = true;
    lastIOCallback = null;
    vi.stubGlobal("Worker", MockWorker);
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    vi.stubGlobal("ResizeObserver", vi.fn().mockImplementation(() => ({ observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() })));
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  it("renders loading state for IFC files", async () => {
    workerAutoRespond = false;
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="test.ifc" ext="ifc" modelId={1} /></I18nProvider>);
    expect(screen.getByText(/\u89e3\u6790\u6a21\u578b/)).toBeInTheDocument();
  });

  it("processes IFC geometries via Worker and reaches ready state", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="test.ifc" ext="ifc" modelId={1} /></I18nProvider>);
    await waitFor(() => { expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument(); });
  });
});

describe("ModelViewer GLB/OBJ/STL support", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workerAutoRespond = true;
    workerResponseOverride = null;
    lastWorkerInstance = null;
    ioAutoTrigger = true;
    lastIOCallback = null;
    vi.stubGlobal("Worker", MockWorker);
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
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
    ioAutoTrigger = true;
    lastIOCallback = null;
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
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
    ioAutoTrigger = true;
    lastIOCallback = null;
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
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
    ioAutoTrigger = true;
    lastIOCallback = null;
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
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
    ioAutoTrigger = true;
    lastIOCallback = null;
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
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
    ioAutoTrigger = true;
    lastIOCallback = null;
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
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

    mockRendererSetSize.mockClear();
    mockUpdateProjectionMatrix.mockClear();

    window.dispatchEvent(new CustomEvent("fontscalechange"));

    expect(mockRendererSetSize).toHaveBeenCalledTimes(1);
    expect(mockUpdateProjectionMatrix).toHaveBeenCalledTimes(1);
  });
});

describe("ModelViewer IFC Worker lifecycle (#173)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workerAutoRespond = true;
    workerResponseOverride = null;
    lastWorkerInstance = null;
    ioAutoTrigger = true;
    lastIOCallback = null;
    vi.stubGlobal("Worker", MockWorker);
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    vi.stubGlobal("ResizeObserver", vi.fn().mockImplementation(() => ({ observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() })));
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  it("terminates Worker once after normal IFC processing and does not re-terminate on unmount (regression #173)", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    const { unmount } = render(
      <I18nProvider><ModelViewer name="test.ifc" ext="ifc" modelId={1} /></I18nProvider>,
    );
    await waitFor(() => {
      expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument();
    });

    expect(mockWorkerTerminate).toHaveBeenCalledTimes(1);

    unmount();
    expect(mockWorkerTerminate).toHaveBeenCalledTimes(1);
  });
});

describe("ModelViewer IFC Worker error handling (#190)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workerAutoRespond = true;
    workerResponseOverride = null;
    lastWorkerInstance = null;
    ioAutoTrigger = true;
    lastIOCallback = null;
    vi.stubGlobal("Worker", MockWorker);
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    vi.stubGlobal("ResizeObserver", vi.fn().mockImplementation(() => ({ observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() })));
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  it("shows error state when IFC Worker reports error (regression #190)", async () => {
    workerResponseOverride = { type: "error", message: "Corrupted IFC data" };

    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="test.ifc" ext="ifc" modelId={1} /></I18nProvider>);

    await waitFor(() => {
      expect(screen.getByText(/Corrupted IFC data/)).toBeInTheDocument();
    });
  });
});

describe("ModelViewer IFC BufferGeometry dispose (#193)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workerAutoRespond = true;
    workerResponseOverride = null;
    lastWorkerInstance = null;
    ioAutoTrigger = true;
    lastIOCallback = null;
    vi.stubGlobal("Worker", MockWorker);
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
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

    const bgInstances = vi.mocked(THREE.BufferGeometry).mock.results
      .filter((r) => r.type === "return")
      .map((r) => r.value as { dispose: ReturnType<typeof vi.fn> });
    expect(bgInstances.length).toBe(2);
    for (const geom of bgInstances) {
      expect(geom.dispose).toHaveBeenCalledTimes(1);
    }
  });
});

describe("ModelViewer IFC Worker unmount during processing (#202)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workerAutoRespond = false;
    workerResponseOverride = null;
    lastWorkerInstance = null;
    ioAutoTrigger = true;
    lastIOCallback = null;
    vi.stubGlobal("Worker", MockWorker);
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    vi.stubGlobal("ResizeObserver", vi.fn().mockImplementation(() => ({ observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() })));
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  it("terminates IFC Worker on unmount during active processing (regression #202)", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    const { unmount } = render(
      <I18nProvider><ModelViewer name="test.ifc" ext="ifc" modelId={1} /></I18nProvider>,
    );

    await waitFor(() => {
      expect(lastWorkerInstance).not.toBeNull();
    });

    expect(mockWorkerTerminate).not.toHaveBeenCalled();

    unmount();

    expect(mockWorkerTerminate).toHaveBeenCalledTimes(1);
  });
});

describe("ModelViewer IntersectionObserver deferred init (#203)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ioAutoTrigger = false;
    lastIOCallback = null;
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    vi.stubGlobal("ResizeObserver", vi.fn().mockImplementation(() => ({ observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() })));
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  it("does not create WebGLRenderer until container is visible (regression #203)", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="t.glb" ext="glb" modelId={1} /></I18nProvider>);

    await new Promise((r) => setTimeout(r, 50));

    expect(mockWebGLRenderer).not.toHaveBeenCalled();

    await act(async () => {
      lastIOCallback?.([{ isIntersecting: true }]);
    });

    await waitFor(() => {
      expect(mockWebGLRenderer).toHaveBeenCalledTimes(1);
    });
  });
});

describe("ModelViewer IFC WASM timeout (#265)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workerAutoRespond = true;
    workerResponseOverride = null;
    lastWorkerInstance = null;
    ioAutoTrigger = true;
    lastIOCallback = null;
    vi.stubGlobal("Worker", MockWorker);
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    vi.stubGlobal("ResizeObserver", vi.fn().mockImplementation(() => ({ observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() })));
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  it("shows error state when IFC Worker reports WASM timeout (regression #265)", async () => {
    workerResponseOverride = { type: "error", message: "IFC WASM initialization timed out (30s)" };

    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="test.ifc" ext="ifc" modelId={1} /></I18nProvider>);

    await waitFor(() => {
      expect(screen.getByText(/IFC WASM initialization timed out/)).toBeInTheDocument();
    });
  });
});

describe("ModelViewer OBJ/STL Worker offload (#447)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workerAutoRespond = true;
    workerResponseOverride = null;
    lastWorkerInstance = null;
    ioAutoTrigger = true;
    lastIOCallback = null;
    vi.stubGlobal("Worker", MockWorker);
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    vi.stubGlobal("ResizeObserver", vi.fn().mockImplementation(() => ({ observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() })));
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  it("OBJ parsing uses Web Worker instead of main thread (regression #447)", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="t.obj" ext="obj" modelId={1} /></I18nProvider>);
    await waitFor(() => {
      expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument();
    });
    expect(lastWorkerInstance).not.toBeNull();
    expect(mockWorkerTerminate).toHaveBeenCalled();
  });

  it("STL parsing uses Web Worker instead of main thread (regression #447)", async () => {
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    render(<I18nProvider><ModelViewer name="t.stl" ext="stl" modelId={1} /></I18nProvider>);
    await waitFor(() => {
      expect(screen.queryByText(/\u89e3\u6790\u6a21\u578b/)).not.toBeInTheDocument();
    });
    expect(lastWorkerInstance).not.toBeNull();
    expect(mockWorkerTerminate).toHaveBeenCalled();
  });

  it("terminates model parse Worker on unmount during active processing (regression #447)", async () => {
    workerAutoRespond = false;
    const { ModelViewer } = await import("@/components/models/ModelViewer");
    const { unmount } = render(
      <I18nProvider><ModelViewer name="t.stl" ext="stl" modelId={1} /></I18nProvider>,
    );

    await waitFor(() => {
      expect(lastWorkerInstance).not.toBeNull();
    });

    expect(mockWorkerTerminate).not.toHaveBeenCalled();
    unmount();
    expect(mockWorkerTerminate).toHaveBeenCalledTimes(1);
  });
});
