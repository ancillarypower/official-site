import { useRef, useEffect, useState, useCallback } from "react";
import { useI18n } from "@/context/I18nContext";
import type { WebGLRenderer, Object3D, BufferGeometry, Scene, Material } from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DRACO_CDN, IFC_WASM_CDN } from "@/lib/constants";
import { getModelData } from "@/hooks/useModelDB";

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

export function ModelViewer({ name: _name, ext, modelId }: ModelViewerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  const toggleFullscreen = useCallback(() => {
    if (!wrapperRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      wrapperRef.current.requestFullscreen();
    }
  }, []);

  useEffect(() => {
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

    async function init() {
      if (!el || disposed) return;

      try {
        // Load model data on demand from IndexedDB.
        // IndexedDB returns a structured clone, so no extra .slice() needed.
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
        const { GLTFLoader } = await import(
          "three/examples/jsm/loaders/GLTFLoader.js"
        );
        const { DRACOLoader } = await import(
          "three/examples/jsm/loaders/DRACOLoader.js"
        );
        const { OBJLoader } = await import(
          "three/examples/jsm/loaders/OBJLoader.js"
        );
        const { STLLoader } = await import(
          "three/examples/jsm/loaders/STLLoader.js"
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

        // WebGL context loss recovery (#57)
        ctxLostHandler = (e: Event) => {
          e.preventDefault();
          cancelAnimationFrame(animId);
          setStatus("error");
          setErrorMsg(t("models_gpu_lost"));
        };

        ctxRestoredHandler = () => {
          if (disposed) return;
          ro?.disconnect();
          ro = null;
          disposeSceneResources(scene);
          controls?.dispose();
          controls = null;
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

        function fitToView(object: Object3D) {
          scene!.add(object);
          const box = new THREE.Box3().setFromObject(object);
          if (box.isEmpty()) throw new Error("No visible geometry");
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          const d = maxDim * 2;
          camera.position.set(
            center.x + d * 0.6,
            center.y + d * 0.4,
            center.z + d * 0.6,
          );
          camera.near = maxDim * 0.001;
          camera.far = maxDim * 100;
          camera.updateProjectionMatrix();
          controls!.target.copy(center);
          controls!.update();
          setStatus("ready");
        }

        const buf = data;
        if (ext === "ifc") {
          // IFC loading branch: web-ifc WASM parser + three.js geometry pipeline
          const WebIFC = await import("web-ifc");
          const { mergeGeometries } = await import(
            "three/examples/jsm/utils/BufferGeometryUtils.js"
          );
          if (disposed) return;

          const ifcApi = new WebIFC.IfcAPI();
          ifcApi.SetWasmPath(IFC_WASM_CDN, true);
          await ifcApi.Init();
          if (disposed) { return; }

          const modelID = ifcApi.OpenModel(new Uint8Array(buf), {
            COORDINATE_TO_ORIGIN: true,
          });

          if (modelID === -1) {
            throw new Error("Failed to open IFC file: unsupported schema or invalid data");
          }

          const opaqueGeometries: BufferGeometry[] = [];
          const transparentGeometries: BufferGeometry[] = [];
          const tmpColor = new THREE.Color();

          ifcApi.StreamAllMeshes(modelID, (flatMesh) => {
            const placedGeometries = flatMesh.geometries;
            for (let i = 0; i < placedGeometries.size(); i++) {
              const pg = placedGeometries.get(i);
              const geometry = ifcApi.GetGeometry(modelID, pg.geometryExpressID);
              const vertexData = ifcApi.GetVertexArray(
                geometry.GetVertexData(),
                geometry.GetVertexDataSize(),
              );
              const indexData = ifcApi.GetIndexArray(
                geometry.GetIndexData(),
                geometry.GetIndexDataSize(),
              );

              // De-interleave vertex data: web-ifc returns [x,y,z,nx,ny,nz] per vertex
              const vertexCount = vertexData.length / 6;
              const positions = new Float32Array(vertexCount * 3);
              const normals = new Float32Array(vertexCount * 3);
              const colors = new Float32Array(vertexCount * 4);

              // sRGB -> linear color space conversion
              tmpColor.setRGB(pg.color.x, pg.color.y, pg.color.z, THREE.SRGBColorSpace);

              for (let v = 0; v < vertexCount; v++) {
                const src = v * 6;
                const dst3 = v * 3;
                const dst4 = v * 4;

                // Indices are guaranteed within bounds (vertexCount = vertexData.length / 6)
                positions[dst3] = vertexData[src]!;
                positions[dst3 + 1] = vertexData[src + 1]!;
                positions[dst3 + 2] = vertexData[src + 2]!;

                normals[dst3] = vertexData[src + 3]!;
                normals[dst3 + 1] = vertexData[src + 4]!;
                normals[dst3 + 2] = vertexData[src + 5]!;

                colors[dst4] = tmpColor.r;
                colors[dst4 + 1] = tmpColor.g;
                colors[dst4 + 2] = tmpColor.b;
                colors[dst4 + 3] = pg.color.w;
              }

              const bufGeom = new THREE.BufferGeometry();
              bufGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
              bufGeom.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
              bufGeom.setAttribute("color", new THREE.BufferAttribute(colors, 4));
              bufGeom.setIndex(new THREE.BufferAttribute(indexData, 1));

              // Apply placement transform
              const matrix = new THREE.Matrix4().fromArray(pg.flatTransformation);
              bufGeom.applyMatrix4(matrix);

              // Separate opaque vs transparent
              if (pg.color.w !== 1) {
                transparentGeometries.push(bufGeom);
              } else {
                opaqueGeometries.push(bufGeom);
              }

              // Release WASM heap memory
              (geometry as unknown as { delete: () => void }).delete();
            }
          });

          // Close the model to free WASM memory
          ifcApi.CloseModel(modelID);

          const group = new THREE.Group();

          if (opaqueGeometries.length > 0) {
            const merged = mergeGeometries(opaqueGeometries);
            if (merged) {
              group.add(
                new THREE.Mesh(
                  merged,
                  new THREE.MeshPhongMaterial({
                    side: THREE.DoubleSide,
                    vertexColors: true,
                  }),
                ),
              );
            }
          }

          if (transparentGeometries.length > 0) {
            const merged = mergeGeometries(transparentGeometries);
            if (merged) {
              group.add(
                new THREE.Mesh(
                  merged,
                  new THREE.MeshPhongMaterial({
                    side: THREE.DoubleSide,
                    vertexColors: true,
                    transparent: true,
                  }),
                ),
              );
            }
          }

          if (group.children.length === 0) {
            throw new Error("No visible geometry in IFC file");
          }

          fitToView(group);
        } else if (ext === "glb" || ext === "gltf") {
          const loader = new GLTFLoader();
          const draco = new DRACOLoader();
          draco.setDecoderPath(DRACO_CDN);
          loader.setDRACOLoader(draco);
          const payload =
            ext === "gltf"
              ? new TextDecoder().decode(new Uint8Array(buf))
              : buf;
          loader.parse(
            payload,
            "",
            (result) => {
              if (!disposed) {
                try {
                  fitToView(result.scene);
                } catch (e) {
                  setErrorMsg(
                    e instanceof Error ? e.message : "GLTF parse failed",
                  );
                  setStatus("error");
                }
              }
            },
            (err) => {
              if (!disposed) {
                setErrorMsg(
                  err instanceof Error ? err.message : "GLTF parse failed",
                );
                setStatus("error");
              }
            },
          );
        } else if (ext === "obj") {
          fitToView(
            new OBJLoader().parse(
              new TextDecoder().decode(new Uint8Array(buf)),
            ),
          );
        } else if (ext === "stl") {
          const stlGeometry = new STLLoader().parse(buf);
          fitToView(
            new THREE.Mesh(
              stlGeometry,
              new THREE.MeshStandardMaterial({
                color: 0x8899aa,
                metalness: 0.3,
                roughness: 0.6,
              }),
            ),
          );
        }
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
      disposeSceneResources(scene);
      controls?.dispose();
      if (renderer) {
        if (ctxLostHandler) renderer.domElement.removeEventListener("webglcontextlost", ctxLostHandler);
        if (ctxRestoredHandler) renderer.domElement.removeEventListener("webglcontextrestored", ctxRestoredHandler);
        renderer.dispose();
        renderer.domElement.parentNode?.removeChild(renderer.domElement);
      }
    };
  }, [ext, modelId]);

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
        <button
          onClick={toggleFullscreen}
          className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded bg-surface-raised/80 text-sm text-tertiary backdrop-blur-sm transition-colors hover:bg-surface-sunken"
          aria-label={isFullscreen ? t("models_exit_fullscreen") : t("models_fullscreen")}
          title={isFullscreen ? t("models_exit_fullscreen") : t("models_fullscreen")}
        >
          {isFullscreen ? "\u2715" : "\u26F6"}
        </button>
      )}
    </div>
  );
}
