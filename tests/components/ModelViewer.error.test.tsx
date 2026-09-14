/**
 * Regression tests for GLTF error callback handling (#46).
 *
 * Isolated in a separate file so vi.mock() factories can define
 * error-path GLTFLoader behavior without leaking into the happy-path
 * tests in ModelViewer.test.tsx.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "@/context/I18nContext";

// ---- Hoisted spy so tests can swap GLTFLoader.parse behavior ----
const gltfParseSpy = vi.fn();

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
// GLTFLoader delegates to gltfParseSpy so each test can set its behavior.
vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: vi.fn().mockImplementation(() => ({
    setDRACOLoader: vi.fn(),
    parse: gltfParseSpy,
  })),
}));
vi.mock("three/examples/jsm/loaders/DRACOLoader.js", () => ({
  DRACOLoader: vi.fn().mockImplementation(() => ({ setDecoderPath: vi.fn() })),
}));
vi.mock("three/examples/jsm/loaders/OBJLoader.js", () => ({
  OBJLoader: vi.fn().mockImplementation(() => ({ parse: vi.fn(() => ({ children: [{}], add: vi.fn() })) })),
}));
vi.mock("three/examples/jsm/loaders/STLLoader.js", () => ({
  STLLoader: vi.fn().mockImplementation(() => ({ parse: vi.fn(() => ({})) })),
}));
vi.mock("three/examples/jsm/environments/RoomEnvironment.js", () => ({ RoomEnvironment: vi.fn() }));
vi.mock("three/examples/jsm/utils/BufferGeometryUtils.js", () => ({
  mergeGeometries: vi.fn().mockReturnValue({}),
}));

describe("ModelViewer GLTF error handling", () => {
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

  it("shows error message when GLTF parsing fails", async () => {
    gltfParseSpy.mockImplementation(
      (_d: unknown, _p: string, _onLoad: unknown, onError: (e: Error) => void) => {
        onError(new Error("corrupt file"));
      },
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
    // Success callback triggers fitToView, which calls Box3.isEmpty
    gltfParseSpy.mockImplementation(
      (_d: unknown, _p: string, onLoad: (r: unknown) => void) => {
        onLoad({ scene: { children: [{}], add: vi.fn() } });
      },
    );

    // Override Box3 to return isEmpty = true
    const threeMod = await import("three");
    vi.mocked(threeMod.Box3).mockImplementation(
      () =>
        ({
          setFromObject: vi.fn().mockReturnThis(),
          isEmpty: vi.fn().mockReturnValue(true),
          getCenter: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0, copy: vi.fn() }),
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
    gltfParseSpy.mockImplementation(
      (_d: unknown, _p: string, _onLoad: unknown, onError: (e: Error) => void) => {
        capturedOnError = onError;
      },
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
