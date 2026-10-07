/**
 * Unit tests for the viewer helpers extracted from ModelViewer (#595).
 *
 * Uses a hand-rolled fake three.js namespace injected through ViewerDeps,
 * so no vi.mock("three") is needed. The component-level behaviour stays
 * covered by the existing ModelViewer*.test.tsx files.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  attachContextRecovery,
  attachViewportSync,
  createFitToView,
  createViewerHandles,
  createViewerScene,
  disposeSceneResources,
  teardownViewer,
  type ViewerDeps,
} from "@/components/models/viewerScene";

function makeFakeThree(opts: { pmremError?: Error; boxEmpty?: boolean } = {}) {
  const spies = {
    pmremDispose: vi.fn(),
    rendererDispose: vi.fn(),
    setSize: vi.fn(),
    cameraSet: vi.fn(),
    updateProjectionMatrix: vi.fn(),
  };
  const THREE = {
    Scene: vi.fn().mockImplementation(() => ({
      background: null, environment: null, add: vi.fn(), traverse: vi.fn(),
    })),
    Color: vi.fn(),
    PerspectiveCamera: vi.fn().mockImplementation(() => ({
      position: { set: spies.cameraSet }, aspect: 1, near: 0.01, far: 1000,
      updateProjectionMatrix: spies.updateProjectionMatrix,
    })),
    WebGLRenderer: vi.fn().mockImplementation(() => ({
      domElement: document.createElement("canvas"),
      setSize: spies.setSize, setPixelRatio: vi.fn(), toneMapping: 0, toneMappingExposure: 1,
      render: vi.fn(), dispose: spies.rendererDispose,
    })),
    PMREMGenerator: vi.fn().mockImplementation(() => ({
      fromScene: vi.fn(() => {
        if (opts.pmremError) throw opts.pmremError;
        return { texture: { isTexture: true } };
      }),
      dispose: spies.pmremDispose,
    })),
    AmbientLight: vi.fn(),
    DirectionalLight: vi.fn().mockImplementation(() => ({ position: { set: vi.fn() } })),
    GridHelper: vi.fn(),
    Box3: vi.fn().mockImplementation(() => ({
      setFromObject: vi.fn().mockReturnThis(),
      isEmpty: vi.fn().mockReturnValue(!!opts.boxEmpty),
      getCenter: vi.fn().mockReturnValue({ x: 1, y: 2, z: 3 }),
      getSize: vi.fn().mockReturnValue({ x: 2, y: 4, z: 1 }),
    })),
    Vector3: vi.fn().mockImplementation(() => ({ x: 0, y: 0, z: 0 })),
    ACESFilmicToneMapping: 4,
  };
  return { THREE: THREE as unknown as ViewerDeps["THREE"], spies };
}

function makeDeps(opts?: Parameters<typeof makeFakeThree>[0], controlsImpl?: () => unknown) {
  const { THREE, spies } = makeFakeThree(opts);
  const controlsDispose = vi.fn();
  const OrbitControls = vi.fn().mockImplementation(
    controlsImpl ?? (() => ({
      enableDamping: false, dampingFactor: 0, autoRotate: false, autoRotateSpeed: 0,
      target: { copy: vi.fn() }, update: vi.fn(), dispose: controlsDispose,
    })),
  );
  const deps = {
    THREE,
    OrbitControls: OrbitControls as unknown as ViewerDeps["OrbitControls"],
    RoomEnvironment: vi.fn() as unknown as ViewerDeps["RoomEnvironment"],
  };
  return { deps, spies: { ...spies, controlsDispose } };
}

let roInstances: Array<{ observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }>;

beforeEach(() => {
  roInstances = [];
  vi.stubGlobal("ResizeObserver", vi.fn().mockImplementation(() => {
    const ro = { observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() };
    roInstances.push(ro);
    return ro;
  }));
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createViewerScene (#595)", () => {
  it("appends the canvas and records scene, renderer and controls in handles", () => {
    const { deps } = makeDeps();
    const el = document.createElement("div");
    const handles = createViewerHandles();
    const view = createViewerScene(deps, el, handles);
    expect(el.contains(view.renderer.domElement)).toBe(true);
    expect(handles.scene).toBe(view.scene);
    expect(handles.renderer).toBe(view.renderer);
    expect(handles.controls).toBe(view.controls);
    expect(view.controls.autoRotate).toBe(true);
  });

  it("disables autoRotate when prefers-reduced-motion is set", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    const { deps } = makeDeps();
    const view = createViewerScene(deps, document.createElement("div"), createViewerHandles());
    expect(view.controls.autoRotate).toBe(false);
  });

  it("still returns a usable scene, warns and disposes PMREM when fromScene throws (#585)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const pmremError = new Error("PMREM failed");
    const { deps, spies } = makeDeps({ pmremError });
    const view = createViewerScene(deps, document.createElement("div"), createViewerHandles());
    expect(view.scene).toBeTruthy();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[ModelViewer]"), pmremError);
    expect(spies.pmremDispose).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("leaves already-created objects in handles when setup throws midway, so teardown can release them", () => {
    const { deps, spies } = makeDeps(undefined, () => { throw new Error("controls failed"); });
    const el = document.createElement("div");
    const handles = createViewerHandles();
    expect(() => createViewerScene(deps, el, handles)).toThrow("controls failed");
    expect(handles.renderer).not.toBeNull();
    expect(handles.scene).not.toBeNull();
    teardownViewer(handles);
    expect(spies.rendererDispose).toHaveBeenCalledTimes(1);
    expect(el.querySelector("canvas")).toBeNull();
  });
});

describe("attachViewportSync (#110, #595)", () => {
  function setup(isDisposed = () => false) {
    const { deps, spies } = makeDeps();
    const el = document.createElement("div");
    const view = createViewerScene(deps, el, createViewerHandles());
    spies.setSize.mockClear();
    const detach = attachViewportSync(el, view.camera, view.renderer, isDisposed);
    return { spies, detach };
  }

  it("resizes on fontscalechange using the fallback size", () => {
    const { spies } = setup();
    window.dispatchEvent(new CustomEvent("fontscalechange"));
    expect(spies.setSize).toHaveBeenCalledTimes(1);
    expect(spies.setSize).toHaveBeenCalledWith(400, 250);
  });

  it("ignores fontscalechange once disposed", () => {
    const { spies } = setup(() => true);
    window.dispatchEvent(new CustomEvent("fontscalechange"));
    expect(spies.setSize).not.toHaveBeenCalled();
  });

  it("detach disconnects the ResizeObserver and removes the fontscalechange listener", () => {
    const { spies, detach } = setup();
    detach();
    expect(roInstances.at(-1)!.disconnect).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new CustomEvent("fontscalechange"));
    expect(spies.setSize).not.toHaveBeenCalled();
  });
});

describe("attachContextRecovery (#57, #595)", () => {
  it("prevents default on context loss and forwards both events", () => {
    const canvas = document.createElement("canvas");
    const onLost = vi.fn();
    const onRestored = vi.fn();
    attachContextRecovery(canvas, { onLost, onRestored });
    const lost = new Event("webglcontextlost", { cancelable: true });
    canvas.dispatchEvent(lost);
    expect(lost.defaultPrevented).toBe(true);
    expect(onLost).toHaveBeenCalledTimes(1);
    canvas.dispatchEvent(new Event("webglcontextrestored"));
    expect(onRestored).toHaveBeenCalledTimes(1);
  });

  it("detach removes both listeners", () => {
    const canvas = document.createElement("canvas");
    const onLost = vi.fn();
    const onRestored = vi.fn();
    const detach = attachContextRecovery(canvas, { onLost, onRestored });
    detach();
    canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
    canvas.dispatchEvent(new Event("webglcontextrestored"));
    expect(onLost).not.toHaveBeenCalled();
    expect(onRestored).not.toHaveBeenCalled();
  });
});

describe("createFitToView (#336, #595)", () => {
  it("frames the object and hands back a reset function that re-applies the viewpoint", () => {
    const { deps, spies } = makeDeps();
    const view = createViewerScene(deps, document.createElement("div"), createViewerHandles());
    spies.cameraSet.mockClear();
    const onFitted = vi.fn();
    const fit = createFitToView(deps.THREE, view, onFitted);
    const obj = {} as never;
    fit(obj);
    expect(view.scene.add).toHaveBeenCalledWith(obj);
    expect(spies.cameraSet).toHaveBeenCalledTimes(1);
    // maxDim = 4, d = 8 -> center + (4.8, 3.2, 4.8)
    expect(spies.cameraSet).toHaveBeenCalledWith(5.8, 5.2, 7.8);
    expect(view.camera.near).toBeCloseTo(0.004);
    expect(view.camera.far).toBe(400);
    expect(onFitted).toHaveBeenCalledTimes(1);
    const reset = onFitted.mock.calls[0]![0] as () => void;
    reset();
    expect(spies.cameraSet).toHaveBeenCalledTimes(2);
    expect(spies.cameraSet).toHaveBeenLastCalledWith(5.8, 5.2, 7.8);
  });

  it("throws and does not call onFitted when the object has no visible geometry", () => {
    const { deps } = makeDeps({ boxEmpty: true });
    const view = createViewerScene(deps, document.createElement("div"), createViewerHandles());
    const onFitted = vi.fn();
    const fit = createFitToView(deps.THREE, view, onFitted);
    expect(() => fit({} as never)).toThrow("No visible geometry");
    expect(onFitted).not.toHaveBeenCalled();
  });
});

describe("teardownViewer (#595)", () => {
  it("cancels the frame, runs detachers, disposes resources and removes the canvas", () => {
    const { deps, spies } = makeDeps();
    const el = document.createElement("div");
    const handles = createViewerHandles();
    const view = createViewerScene(deps, el, handles);
    handles.animId = 42;
    const detach = vi.fn();
    handles.detachers.push(detach);

    teardownViewer(handles);

    expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
    expect(detach).toHaveBeenCalledTimes(1);
    expect(view.scene.traverse).toHaveBeenCalledTimes(1);
    expect(spies.controlsDispose).toHaveBeenCalledTimes(1);
    expect(spies.rendererDispose).toHaveBeenCalledTimes(1);
    expect(el.querySelector("canvas")).toBeNull();
    expect(handles).toMatchObject({ scene: null, renderer: null, controls: null, animId: 0, detachers: [] });
  });

  it("is idempotent: a second call disposes nothing twice", () => {
    const { deps, spies } = makeDeps();
    const handles = createViewerHandles();
    createViewerScene(deps, document.createElement("div"), handles);
    const detach = vi.fn();
    handles.detachers.push(detach);
    teardownViewer(handles);
    teardownViewer(handles);
    expect(detach).toHaveBeenCalledTimes(1);
    expect(spies.controlsDispose).toHaveBeenCalledTimes(1);
    expect(spies.rendererDispose).toHaveBeenCalledTimes(1);
  });
});

describe("disposeSceneResources", () => {
  it("is a no-op for null", () => {
    expect(() => disposeSceneResources(null)).not.toThrow();
  });

  it("disposes mesh geometry, material textures, materials and the environment", () => {
    const geometry = { dispose: vi.fn() };
    const map = { isTexture: true, dispose: vi.fn() };
    const material = { map, dispose: vi.fn() };
    const environment = { dispose: vi.fn() };
    const scene = {
      environment,
      traverse: (cb: (o: unknown) => void) => {
        cb({ isMesh: true, geometry, material: [material] });
        cb({ isMesh: false });
      },
    };
    disposeSceneResources(scene as never);
    expect(geometry.dispose).toHaveBeenCalledTimes(1);
    expect(map.dispose).toHaveBeenCalledTimes(1);
    expect(material.dispose).toHaveBeenCalledTimes(1);
    expect(environment.dispose).toHaveBeenCalledTimes(1);
  });
});
