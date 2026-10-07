import { useRef, useEffect, useState, useCallback } from "react";
import { useI18n } from "@/context/I18nContext";
import { toast } from "sonner";
import { getModelData } from "@/hooks/useModelDB";
import {
  loadModel,
  createLoaderResources,
  cleanupLoaderResources,
  type LoaderContext,
} from "./modelLoaders";
import {
  attachContextRecovery,
  attachViewportSync,
  createFitToView,
  createViewerHandles,
  createViewerScene,
  teardownViewer,
} from "./viewerScene";

interface ModelViewerProps {
  name: string;
  ext: string;
  modelId: number;
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

  // Viewer lifecycle. Setup and teardown details live in viewerScene.ts
  // (#595); this effect only sequences them.
  useEffect(() => {
    if (!isVisible) return;
    const el = containerRef.current;
    if (!el) return;
    let disposed = false;
    const viewer = createViewerHandles();
    const loaderRes = createLoaderResources();

    // Single teardown path shared by unmount and context restore (#595)
    function teardown() {
      teardownViewer(viewer);
      cleanupLoaderResources(loaderRes);
      resetViewpointRef.current = null;
    }

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
        const { OrbitControls } = await import(
          "three/examples/jsm/controls/OrbitControls.js"
        );
        const { RoomEnvironment } = await import(
          "three/examples/jsm/environments/RoomEnvironment.js"
        );
        if (disposed) return;

        const { scene, camera, renderer, controls } = createViewerScene(
          { THREE, OrbitControls, RoomEnvironment },
          el,
          viewer,
        );

        viewer.detachers.push(
          attachContextRecovery(renderer.domElement, {
            onLost: () => {
              cancelAnimationFrame(viewer.animId);
              setStatus("error");
              setErrorMsg(tRef.current("models_gpu_lost"));
            },
            onRestored: () => {
              if (disposed) return;
              teardown();
              setStatus("loading");
              init();
            },
          }),
          attachViewportSync(el, camera, renderer, () => disposed),
        );

        const animate = () => {
          // Stop if unmounted or if this renderer was torn down (context restore)
          if (disposed || viewer.renderer !== renderer) return;
          viewer.animId = requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        };
        animate();

        const loaderCtx: LoaderContext = {
          fitToView: createFitToView(
            THREE,
            { scene, camera, controls },
            (resetViewpoint) => {
              // Save initial viewpoint for reset button (#336)
              resetViewpointRef.current = resetViewpoint;
              setStatus("ready");
            },
          ),
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
      teardown();
    };
  }, [ext, modelId, isVisible]);

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full bg-viewer-bg ${isFullscreen ? "h-screen" : "aspect-video"}`}
    >
      <div ref={containerRef} className="h-full w-full" />
      {status === "loading" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-viewer-bg text-sm text-viewer-text">
          <span className="h-2 w-2 animate-bounce rounded-full bg-accent" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:200ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:400ms]" />
          <span>{t("models_parsing")}</span>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 bg-viewer-bg p-4 text-center text-sm text-viewer-error">
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
