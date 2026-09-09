import { useRef, useEffect, useState } from "react";
import { useI18n } from "@/context/I18nContext";
import type { WebGLRenderer, Object3D } from "three";

interface ModelViewerProps {
  name: string;
  ext: string;
  data: ArrayBuffer;
}

export function ModelViewer({ name: _name, ext, data }: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let disposed = false;
    let animId: number;
    let renderer: WebGLRenderer | null = null;
    let ro: ResizeObserver | null = null;

    async function init() {
      // Re-check inside async closure for TS strictNullChecks
      if (!el || disposed) return;

      try {
        const THREE = await import("three");
        const { OrbitControls } = await import(
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
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);
        const camera = new THREE.PerspectiveCamera(50, w / h, 0.01, 1000);
        camera.position.set(2, 1.5, 2);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1;
        el.appendChild(renderer.domElement);

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

        const controls = new OrbitControls(camera, renderer.domElement);
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
          controls.update();
          renderer?.render(scene, camera);
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
          scene.add(object);
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
          controls.target.copy(center);
          controls.update();
          setStatus("ready");
        }

        const buf = data.slice(0);
        if (ext === "glb" || ext === "gltf") {
          const loader = new GLTFLoader();
          const draco = new DRACOLoader();
          draco.setDecoderPath(
            "https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/libs/draco/gltf/",
          );
          loader.setDRACOLoader(draco);
          const payload =
            ext === "gltf"
              ? new TextDecoder().decode(new Uint8Array(buf))
              : buf;
          loader.parse(
            payload,
            "",
            (result) => fitToView(result.scene),
            (err) => {
              throw err;
            },
          );
        } else if (ext === "obj") {
          fitToView(
            new OBJLoader().parse(
              new TextDecoder().decode(new Uint8Array(buf)),
            ),
          );
        } else if (ext === "stl") {
          const geometry = new STLLoader().parse(buf);
          fitToView(
            new THREE.Mesh(
              geometry,
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
      if (renderer) {
        renderer.dispose();
        renderer.domElement.parentNode?.removeChild(renderer.domElement);
      }
    };
  }, [ext, data]);

  return (
    <div className="relative aspect-video w-full bg-[oklch(14%_0.008_250)]">
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
          <span>\u26a0\ufe0f</span>
          <span>
            {t("models_error")}: {errorMsg}
          </span>
        </div>
      )}
    </div>
  );
}
