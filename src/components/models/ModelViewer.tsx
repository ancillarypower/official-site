import { useRef, useEffect, useState, useCallback } from "react";
import { useI18n } from "@/context/I18nContext";
import { toast } from "sonner";
import type { WebGLRenderer, Object3D, Scene, Material } from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { getModelData } from "@/hooks/useModelDB";
import {
  loadModel,
  createLoaderResources,
  cleanupLoaderResources,
  type LoaderContext,
} from "./modelLoaders";

interface ModelViewerProps {
  name: string;
  ext: string;
  modelId: number;
}

/**
 * Traverse a Three.js scene and dispose all GPU resources:
 * geometries, materials, and textures attached to Mesh nodes,
 * plus the scene environment texture.
 */
function disposeSceneResources(s: Scene | null): void {
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

/** Feature-detect Fullscreen API once at module load (#451) */
const supportsFullscreen = !!document.documentElement?.requestFullscreen;

export function ModelViewer({ name: _name, ext, modelId }: ModelViewerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resetViewpointRef = useRef<(() => void) | null>(null);
  const { t } = useI18n();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Keep a mutable ref to `t` so the heavy WebGL useEffect can read the
  // latest translation function without listing it as a dependency (which
  // would tear down and rebuild the entire 3D scene on every language switch).
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  // Track fullscreen state via Fullscreen API events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === wrapperRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Defer WebGL init until container scrolls into viewport (#203)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!wrapperRef.current) return;
    const promise = document.fullscreenElement
      ? document.exitFullscreen()
      : wrapperRef.current.requestFullscreen();
    promise.catch(() => {
      toast.error(t("models_fullscreen_unavailable"));
    });
  }, [t]);

  const handleResetViewpoint = useCallback(() => {
    resetViewpointRef.current?.();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const el = containerRef.current;
    if (!el) return;
    let disposed = false;
    let animId: number;
    let renderer: WebGLRenderer | null = null;
    let ro: ResizeObserver | null = null;
    let ctxLostHandler: ((e: Event) => void) | null = null;
    let ctxRestoredHandler: (() => void) | null = null;
    let scene: Scene | null = null;
    let controls: OrbitControls | null = null;
    let fontScaleHandler: (() => void) | null = null;
    const loaderRes = createLoaderResources();

    async function init() {
      if (!el || disposed) return;

      try {
        const data = await getModelData(modelId);
        if (disposed) return;
        if (!data) {
          setErrorMsg("Model data not found in storage");
          setStatus("error");
          return;
        }

        const THREE = await import("three");
        const { OrbitControls: OC } = await import(
          "three/examples/jsm/controls/OrbitControls.js"
        );
        const { RoomEnvironment } = await import(
          "three/examples/jsm/environments/RoomEnvironment.js"
        );
        if (disposed) return;

        const w = el.clientWidth || 400;
        const h = el.clientHeight || 250;
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);
        const camera = new THREE.PerspectiveCamera(50, w / h, 0.01, 1000);
        camera.position.set(2, 1.5, 2);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1;
        el.appendChild(renderer.domElement);

        ctxLostHandler = (e: Event) => {
          e.preventDefault();
          cancelAnimationFrame(animId);
          setStatus("error");
          setErrorMsg(tRef.current("models_gpu_lost"));
        };

        ctxRestoredHandler = () => {
          if (disposed) return;
          ro?.disconnect();
          ro = null;
          if (fontScaleHandler) {
            window.removeEventListener("fontscalechange", fontScaleHandler);
            fontScaleHandler = null;
          }
          disposeSceneResources(scene);
          controls?.dispose();
          controls = null;
          cleanupLoaderResources(loaderRes);
          scene = null;
          if (renderer) {
            if (ctxLostHandler) renderer.domElement.removeEventListener("webglcontextlost", ctxLostHandler);
            if (ctxRestoredHandler) renderer.domElement.removeEventListener("webglcontextrestored", ctxRestoredHandler);
            renderer.dispose();
            renderer.domElement.parentNode?.removeChild(renderer.domElement);
            renderer = null;
          }
          ctxLostHandler = null;
          ctxRestoredHandler = null;
          setStatus("loading");
          init();
        };

        renderer.domElement.addEventListener("webglcontextlost", ctxLostHandler);
        renderer.domElement.addEventListener("webglcontextrestored", ctxRestoredHandler);

        try {
          const pmrem = new THREE.PMREMGenerator(renderer);
          scene.environment = pmrem.fromScene(
            new RoomEnvironment(),
            0.04,
          ).texture;
          pmrem.dispose();
        } catch {
          /* fallback to directional lights only */
        }

        controls = new OC(camera, renderer.domElement);
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

        function animate() {
          if (disposed) return;
          animId = requestAnimationFrame(animate);
          controls?.update();
          renderer?.render(scene!, camera);
        }
        animate();

        ro = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0) {
              camera.aspect = width / height;
              camera.updateProjectionMatrix();
              renderer?.setSize(width, height);
            }
          }
        });
        ro.observe(el);

        // Re-sync WebGL viewport when CSS zoom changes (#110).
        // CSS `zoom` does not trigger ResizeObserver, so we listen for a
        // custom event dispatched by settingsStore.setFontScale().
        fontScaleHandler = () => {
          if (!el || disposed) return;
          const fw = el.clientWidth || 400;
          const fh = el.clientHeight || 250;
          camera.aspect = fw / fh;
          camera.updateProjectionMatrix();
          renderer?.setSize(fw, fh);
        };
        window.addEventListener("fontscalechange", fontScaleHandler);

        function fitToView(object: Object3D) {
          scene!.add(object);
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
          camera.position.set(posX, posY, posZ);
          camera.near = nearVal;
          camera.far = farVal;
          camera.updateProjectionMatrix();
          controls!.target.copy(center);
          controls!.update();

          // Save initial viewpoint for reset button (#336)
          resetViewpointRef.current = () => {
            camera.position.set(posX, posY, posZ);
            camera.near = nearVal;
            camera.far = farVal;
            camera.updateProjectionMatrix();
            controls!.target.copy(center);
            controls!.update();
          };

          setStatus("ready");
        }

        const loaderCtx: LoaderContext = {
          fitToView,
          isDisposed: () => disposed,
          setStatus,
          setErrorMsg,
        };

        await loadModel(data, ext, loaderCtx, loaderRes);
      } catch (err) {
        if (!disposed) {
          setErrorMsg(err instanceof Error ? err.message : "Unknown error");
          setStatus("error");
        }
      }
    }

    init();

    return () => {
      disposed = true;
      cancelAnimationFrame(animId);
      ro?.disconnect();
      if (fontScaleHandler) {
        window.removeEventListener("fontscalechange", fontScaleHandler);
      }
      disposeSceneResources(scene);
      cleanupLoaderResources(loaderRes);
      controls?.dispose();
      resetViewpointRef.current = null;
      if (renderer) {
        if (ctxLostHandler) renderer.domElement.removeEventListener("webglcontextlost", ctxLostHandler);
        if (ctxRestoredHandler) renderer.domElement.removeEventListener("webglcontextrestored", ctxRestoredHandler);
        renderer.dispose();
        renderer.domElement.parentNode?.removeChild(renderer.domElement);
      }
    };
  }, [ext, modelId, isVisible]);

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full bg-[oklch(14%_0.008_250)] ${isFullscreen ? "h-screen" : "aspect-video"}`}
    >
      <div ref={containerRef} className="h-full w-full" />
      {status === "loading" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-[oklch(14%_0.008_250)] text-sm text-[oklch(70%_0.02_250)]">
          <span className="h-2 w-2 animate-bounce rounded-full bg-accent" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:200ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:400ms]" />
          <span>{t("models_parsing")}</span>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 bg-[oklch(14%_0.008_250)] p-4 text-center text-sm text-[oklch(65%_0.08_25)]">
          <span>{"\u26A0\uFE0F"}</span>
          <span>
            {t("models_error")}: {errorMsg}
          </span>
        </div>
      )}
      {status === "ready" && (
        <>
          <button
            onClick={handleResetViewpoint}
            className="absolute bottom-2 right-12 flex h-8 w-8 items-center justify-center rounded bg-surface-raised/80 text-sm text-tertiary backdrop-blur-sm transition-colors hover:bg-surface-sunken"
            aria-label={t("models_reset_viewpoint")}
            title={t("models_reset_viewpoint")}
          >
            {"\u21BA"}
          </button>
          {supportsFullscreen && (
            <button
              onClick={toggleFullscreen}
              className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded bg-surface-raised/80 text-sm text-tertiary backdrop-blur-sm transition-colors hover:bg-surface-sunken"
              aria-label={isFullscreen ? t("models_exit_fullscreen") : t("models_fullscreen")}
              title={isFullscreen ? t("models_exit_fullscreen") : t("models_fullscreen")}
            >
              {isFullscreen ? "\u2715" : "\u26F6"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
