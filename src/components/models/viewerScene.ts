/**
 * WebGL scene setup and teardown helpers extracted from ModelViewer (#595).
 *
 * ModelViewer's effect only orchestrates the lifecycle; every concern
 * (scene construction, viewport sync, context recovery, camera fitting,
 * teardown) lives here as a plain function so it can be unit-tested
 * without rendering React.
 *
 * three.js and its addons are injected through `ViewerDeps` instead of
 * imported here, so ModelViewer keeps loading them lazily (#305).
 */

import type {
  Material,
  Object3D,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  WebGLRenderer,
} from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/** Resolved type of the dynamically imported three.js module. */
type ThreeNamespace = typeof import("three");

/** Fallback canvas size when the container has not been laid out yet. */
const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 250;

/** Lazily imported three.js modules the viewer needs. */
export interface ViewerDeps {
  THREE: ThreeNamespace;
  OrbitControls: typeof import("three/examples/jsm/controls/OrbitControls.js").OrbitControls;
  RoomEnvironment: typeof import("three/examples/jsm/environments/RoomEnvironment.js").RoomEnvironment;
}

/** Objects returned by createViewerScene(). */
export interface ViewerScene {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  controls: OrbitControls;
}

/**
 * Mutable bag of everything teardownViewer() has to release.
 * createViewerScene() fills it as each object is created, so a throw
 * halfway through setup still leaves the created objects reachable.
 */
export interface ViewerHandles {
  scene: Scene | null;
  renderer: WebGLRenderer | null;
  controls: OrbitControls | null;
  animId: number;
  detachers: Array<() => void>;
}

/** Factory for an empty handles bag. */
export function createViewerHandles(): ViewerHandles {
  return { scene: null, renderer: null, controls: null, animId: 0, detachers: [] };
}

/**
 * Traverse a Three.js scene and dispose all GPU resources:
 * geometries, materials, and textures attached to Mesh nodes,
 * plus the scene environment texture.
 */
export function disposeSceneResources(s: Scene | null): void {
  if (!s) return;
  s.traverse((obj: Object3D) => {
    if ("isMesh" in obj && (obj as { isMesh: boolean }).isMesh) {
      const mesh = obj as unknown as {
        geometry?: { dispose: () => void };
        material?: Material | Material[];
      };
      mesh.geometry?.dispose();
      const mats: Material[] = Array.isArray(mesh.material)
        ? mesh.material
        : mesh.material
          ? [mesh.material]
          : [];
      for (const mat of mats) {
        if (!mat) continue;
        for (const val of Object.values(mat)) {
          if (val && typeof val === "object" && "isTexture" in val) {
            (val as { dispose: () => void }).dispose();
          }
        }
        mat.dispose();
      }
    }
  });
  (s.environment as { dispose?: () => void } | null)?.dispose?.();
}

/**
 * Environment map is optional: on failure, log and fall back to
 * directional lights only. Always dispose the generator (#585).
 */
function applyEnvironmentMap(
  THREE: ThreeNamespace,
  RoomEnvironment: ViewerDeps["RoomEnvironment"],
  renderer: WebGLRenderer,
  scene: Scene,
): void {
  let pmrem: PMREMGenerator | null = null;
  try {
    pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  } catch (err) {
    console.warn(
      "[ModelViewer] PMREMGenerator failed, using directional lights only:",
      err,
    );
  } finally {
    pmrem?.dispose();
  }
}

/**
 * Build renderer, scene, camera, environment map, controls, lights and
 * grid, and append the canvas to `el`. Each object is recorded in
 * `handles` as soon as it exists.
 */
export function createViewerScene(
  deps: ViewerDeps,
  el: HTMLElement,
  handles: ViewerHandles,
): ViewerScene {
  const { THREE, OrbitControls: OC, RoomEnvironment } = deps;
  const w = el.clientWidth || DEFAULT_WIDTH;
  const h = el.clientHeight || DEFAULT_HEIGHT;

  const scene = new THREE.Scene();
  handles.scene = scene;
  scene.background = new THREE.Color(0x1a1a2e);
  const camera = new THREE.PerspectiveCamera(50, w / h, 0.01, 1000);
  camera.position.set(2, 1.5, 2);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  handles.renderer = renderer;
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  el.appendChild(renderer.domElement);

  applyEnvironmentMap(THREE, RoomEnvironment, renderer, scene);

  const controls = new OC(camera, renderer.domElement);
  handles.controls = controls;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.5;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    controls.autoRotate = false;
  }

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const dl = new THREE.DirectionalLight(0xffffff, 2.4);
  dl.position.set(5, 8, 5);
  scene.add(dl);
  const dl2 = new THREE.DirectionalLight(0xffffff, 0.9);
  dl2.position.set(-3, 2, -5);
  scene.add(dl2);
  scene.add(new THREE.GridHelper(10, 20, 0x333355, 0x222244));

  return { scene, camera, renderer, controls };
}

function resizeViewport(
  camera: PerspectiveCamera,
  renderer: WebGLRenderer,
  width: number,
  height: number,
): void {
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

/**
 * Keep camera aspect and renderer size in sync with the container.
 * Returns a detach function that removes both listeners.
 */
export function attachViewportSync(
  el: HTMLElement,
  camera: PerspectiveCamera,
  renderer: WebGLRenderer,
  isDisposed: () => boolean,
): () => void {
  const ro = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) resizeViewport(camera, renderer, width, height);
    }
  });
  ro.observe(el);

  // Re-sync WebGL viewport when CSS zoom changes (#110).
  // CSS `zoom` does not trigger ResizeObserver, so we listen for a
  // custom event dispatched by settingsStore.setFontScale().
  const onFontScale = () => {
    if (isDisposed()) return;
    resizeViewport(
      camera,
      renderer,
      el.clientWidth || DEFAULT_WIDTH,
      el.clientHeight || DEFAULT_HEIGHT,
    );
  };
  window.addEventListener("fontscalechange", onFontScale);

  return () => {
    ro.disconnect();
    window.removeEventListener("fontscalechange", onFontScale);
  };
}

/**
 * Listen for WebGL context loss / restore on the canvas (#57).
 * `webglcontextlost` is preventDefault()-ed so the browser may restore it.
 * Returns a detach function that removes both listeners.
 */
export function attachContextRecovery(
  canvas: HTMLCanvasElement,
  handlers: { onLost: () => void; onRestored: () => void },
): () => void {
  const lost = (e: Event) => {
    e.preventDefault();
    handlers.onLost();
  };
  const restored = () => handlers.onRestored();
  canvas.addEventListener("webglcontextlost", lost);
  canvas.addEventListener("webglcontextrestored", restored);
  return () => {
    canvas.removeEventListener("webglcontextlost", lost);
    canvas.removeEventListener("webglcontextrestored", restored);
  };
}

/**
 * Build the loader's fitToView callback: add the model to the scene,
 * frame it with the camera, then hand a reset-viewpoint function (#336)
 * to `onFitted`. Throws when the object has no visible geometry.
 */
export function createFitToView(
  THREE: ThreeNamespace,
  view: Pick<ViewerScene, "scene" | "camera" | "controls">,
  onFitted: (resetViewpoint: () => void) => void,
): (object: Object3D) => void {
  const { scene, camera, controls } = view;
  return (object) => {
    scene.add(object);
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) throw new Error("No visible geometry");
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const d = maxDim * 2;
    const posX = center.x + d * 0.6;
    const posY = center.y + d * 0.4;
    const posZ = center.z + d * 0.6;
    const nearVal = maxDim * 0.001;
    const farVal = maxDim * 100;

    const applyViewpoint = () => {
      camera.position.set(posX, posY, posZ);
      camera.near = nearVal;
      camera.far = farVal;
      camera.updateProjectionMatrix();
      controls.target.copy(center);
      controls.update();
    };
    applyViewpoint();
    onFitted(applyViewpoint);
  };
}

/**
 * The single teardown path for both unmount and WebGL context restore
 * (#595). Stops the animation loop, runs detachers, disposes GPU
 * resources and removes the canvas. Safe to call more than once.
 */
export function teardownViewer(handles: ViewerHandles): void {
  cancelAnimationFrame(handles.animId);
  for (const detach of handles.detachers.splice(0)) detach();
  disposeSceneResources(handles.scene);
  handles.controls?.dispose();
  if (handles.renderer) {
    handles.renderer.dispose();
    handles.renderer.domElement.parentNode?.removeChild(handles.renderer.domElement);
  }
  handles.scene = null;
  handles.controls = null;
  handles.renderer = null;
  handles.animId = 0;
}
