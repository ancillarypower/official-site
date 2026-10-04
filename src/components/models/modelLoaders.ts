/**
 * Format-specific 3D model loading logic extracted from ModelViewer (#487).
 *
 * Each loader function receives a LoaderContext for scene integration
 * and a mutable LoaderResources bag for cleanup registration.
 */

import type { Object3D, BufferGeometry } from "three";
import type { IfcWorkerMessage, IfcMeshData } from "@/workers/ifcWorker";
import type { ModelParseMessage } from "@/workers/modelParseWorker";
import { DRACO_DECODER_DIR, IFC_WASM_DIR } from "@/lib/constants";

/** Resolved type of the dynamically imported three.js module. */
type ThreeNamespace = typeof import("three");

/**
 * Absolute same-origin URL of a self-hosted decoder directory (#586).
 * BASE_URL covers the GitHub Pages sub-path (/official-site/); the IFC
 * Worker needs an absolute URL because it resolves paths from its own URL.
 */
function decoderUrl(dir: string): string {
  return new URL(`${import.meta.env.BASE_URL}${dir}`, window.location.origin).href;
}

/** Callback interface for loaders to integrate with the scene. */
export interface LoaderContext {
  fitToView: (obj: Object3D) => void;
  isDisposed: () => boolean;
  setStatus: (s: "loading" | "ready" | "error") => void;
  setErrorMsg: (msg: string) => void;
}

/** Mutable bag of resources that need cleanup on unmount. */
export interface LoaderResources {
  dracoLoader: { dispose(): void } | null;
  ifcWorker: Worker | null;
  modelParseWorker: Worker | null;
}

/** Factory for a fresh resources bag. */
export function createLoaderResources(): LoaderResources {
  return { dracoLoader: null, ifcWorker: null, modelParseWorker: null };
}

/** Dispose/terminate all registered loader resources. */
export function cleanupLoaderResources(res: LoaderResources): void {
  res.dracoLoader?.dispose();
  res.dracoLoader = null;
  if (res.ifcWorker) {
    res.ifcWorker.terminate();
    res.ifcWorker = null;
  }
  if (res.modelParseWorker) {
    res.modelParseWorker.terminate();
    res.modelParseWorker = null;
  }
}

/**
 * Rebuild Three.js BufferGeometry objects from Worker-returned
 * typed arrays. Runs on the main thread but is fast because
 * the heavy WASM parsing already happened in the Worker.
 */
function buildGeometriesFromWorker(
  meshes: IfcMeshData[],
  THREE: ThreeNamespace,
): { opaque: BufferGeometry[]; transparent: BufferGeometry[] } {
  const opaque: BufferGeometry[] = [];
  const transparent: BufferGeometry[] = [];

  for (const m of meshes) {
    const bufGeom = new THREE.BufferGeometry();
    bufGeom.setAttribute(
      "position",
      new THREE.BufferAttribute(m.positions, 3),
    );
    bufGeom.setAttribute(
      "normal",
      new THREE.BufferAttribute(m.normals, 3),
    );
    bufGeom.setAttribute(
      "color",
      new THREE.BufferAttribute(m.colors, 4),
    );
    bufGeom.setIndex(
      new THREE.BufferAttribute(m.indices, 1),
    );

    const matrix = new THREE.Matrix4().fromArray(m.flatTransformation);
    bufGeom.applyMatrix4(matrix);

    if (m.transparent) {
      transparent.push(bufGeom);
    } else {
      opaque.push(bufGeom);
    }
  }

  return { opaque, transparent };
}

/**
 * Load GLB/GLTF model via GLTFLoader + DRACOLoader.
 *
 * Returns a Promise that resolves only after `loader.parse()` completes
 * (either via success or error callback). Both callbacks resolve the
 * Promise (never reject) because errors are handled via `ctx.setStatus`.
 * This matches the resolve-always pattern used by Worker-based loaders.
 *
 * Fixes #514: previously `async function` returned a Promise that
 * resolved immediately after calling the callback-based `loader.parse()`.
 */
export function loadGltfModel(
  buf: ArrayBuffer,
  ext: string,
  ctx: LoaderContext,
  res: LoaderResources,
): Promise<void> {
  return Promise.all([
    import("three/examples/jsm/loaders/GLTFLoader.js"),
    import("three/examples/jsm/loaders/DRACOLoader.js"),
  ]).then(([{ GLTFLoader }, { DRACOLoader }]) => {
    if (ctx.isDisposed()) return;

    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath(decoderUrl(DRACO_DECODER_DIR));
    loader.setDRACOLoader(draco);
    res.dracoLoader = draco;

    const payload =
      ext === "gltf"
        ? new TextDecoder().decode(new Uint8Array(buf))
        : buf;

    return new Promise<void>((resolve) => {
      loader.parse(
        payload,
        "",
        (result) => {
          if (!ctx.isDisposed()) {
            try {
              ctx.fitToView(result.scene);
            } catch (e) {
              ctx.setErrorMsg(
                e instanceof Error ? e.message : "GLTF parse failed",
              );
              ctx.setStatus("error");
            }
          }
          resolve();
        },
        (err) => {
          if (!ctx.isDisposed()) {
            ctx.setErrorMsg(
              err instanceof Error ? err.message : "GLTF parse failed",
            );
            ctx.setStatus("error");
          }
          resolve();
        },
      );
    });
  });
}

/** Load IFC model via Web Worker + web-ifc WASM. */
export async function loadIfcModel(
  buf: ArrayBuffer,
  ctx: LoaderContext,
  res: LoaderResources,
): Promise<void> {
  const THREE = await import("three");
  const { mergeGeometries } = await import(
    "three/examples/jsm/utils/BufferGeometryUtils.js"
  );
  if (ctx.isDisposed()) return;

  const worker = new Worker(
    new URL("../../workers/ifcWorker.ts", import.meta.url),
    { type: "module" },
  );
  res.ifcWorker = worker;

  worker.postMessage(
    { buffer: buf, wasmPath: decoderUrl(IFC_WASM_DIR) },
    [buf],
  );

  worker.onmessage = (e: MessageEvent<IfcWorkerMessage>) => {
    res.ifcWorker = null;
    worker.terminate();

    if (ctx.isDisposed()) return;

    const msg = e.data;
    if (msg.type === "error") {
      ctx.setErrorMsg(msg.message);
      ctx.setStatus("error");
      return;
    }

    // Hoist for cleanup access in catch (#291)
    let opaqueGeometries: BufferGeometry[] = [];
    let transparentGeometries: BufferGeometry[] = [];
    const group = new THREE.Group();

    try {
      const result = buildGeometriesFromWorker(msg.meshes, THREE);
      opaqueGeometries = result.opaque;
      transparentGeometries = result.transparent;

      if (opaqueGeometries.length > 0) {
        const merged = mergeGeometries(opaqueGeometries);
        // Release source GPU buffers after merge (#193)
        for (const geom of opaqueGeometries) geom.dispose();
        opaqueGeometries = []; // Mark as cleaned (#291)
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
        // Release source GPU buffers after merge (#193)
        for (const geom of transparentGeometries) geom.dispose();
        transparentGeometries = []; // Mark as cleaned (#291)
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

      ctx.fitToView(group);
    } catch (err) {
      // Dispose leaked intermediate BufferGeometry objects (#291)
      for (const g of [...opaqueGeometries, ...transparentGeometries]) {
        g.dispose();
      }
      // Dispose merged geometries/materials in group not yet in scene
      for (const child of group.children) {
        if ("isMesh" in child && (child as { isMesh: boolean }).isMesh) {
          const mesh = child as unknown as {
            geometry?: { dispose: () => void };
            material?: { dispose: () => void };
          };
          mesh.geometry?.dispose();
          mesh.material?.dispose();
        }
      }

      if (!ctx.isDisposed()) {
        ctx.setErrorMsg(
          err instanceof Error ? err.message : "IFC processing failed",
        );
        ctx.setStatus("error");
      }
    }
  };

  worker.onerror = (e: ErrorEvent) => {
    res.ifcWorker = null;
    if (!ctx.isDisposed()) {
      ctx.setErrorMsg(e.message || "IFC Worker crashed");
      ctx.setStatus("error");
    }
  };
}

/** Load OBJ/STL model via Web Worker. */
export async function loadObjStlModel(
  buf: ArrayBuffer,
  ext: string,
  ctx: LoaderContext,
  res: LoaderResources,
): Promise<void> {
  const THREE = await import("three");
  if (ctx.isDisposed()) return;

  const worker = new Worker(
    new URL("../../workers/modelParseWorker.ts", import.meta.url),
    { type: "module" },
  );
  res.modelParseWorker = worker;

  worker.postMessage(
    { format: ext as "obj" | "stl", buffer: buf },
    [buf],
  );

  worker.onmessage = (ev: MessageEvent<ModelParseMessage>) => {
    res.modelParseWorker = null;
    worker.terminate();

    if (ctx.isDisposed()) return;

    const msg = ev.data;
    if (msg.type === "error") {
      ctx.setErrorMsg(msg.message);
      ctx.setStatus("error");
      return;
    }

    try {
      if (ext === "stl") {
        // Single geometry -> Mesh with MeshStandardMaterial
        const md = msg.meshes[0];
        if (!md) {
          ctx.setErrorMsg("STL file contains no geometry");
          ctx.setStatus("error");
          return;
        }
        const geom = new THREE.BufferGeometry();
        geom.setAttribute(
          "position",
          new THREE.BufferAttribute(md.positions, 3),
        );
        if (md.normals) {
          geom.setAttribute(
            "normal",
            new THREE.BufferAttribute(md.normals, 3),
          );
        }
        if (md.indices) {
          geom.setIndex(new THREE.BufferAttribute(md.indices, 1));
        }
        ctx.fitToView(
          new THREE.Mesh(
            geom,
            new THREE.MeshStandardMaterial({
              color: 0x8899aa,
              metalness: 0.3,
              roughness: 0.6,
            }),
          ),
        );
      } else {
        // OBJ -> Group of Meshes with MeshPhongMaterial
        const group = new THREE.Group();
        for (const md of msg.meshes) {
          const geom = new THREE.BufferGeometry();
          geom.setAttribute(
            "position",
            new THREE.BufferAttribute(md.positions, 3),
          );
          if (md.normals) {
            geom.setAttribute(
              "normal",
              new THREE.BufferAttribute(md.normals, 3),
            );
          }
          if (md.indices) {
            geom.setIndex(new THREE.BufferAttribute(md.indices, 1));
          }
          group.add(
            new THREE.Mesh(
              geom,
              new THREE.MeshPhongMaterial({ side: THREE.DoubleSide }),
            ),
          );
        }
        ctx.fitToView(group);
      }
    } catch (err) {
      if (!ctx.isDisposed()) {
        ctx.setErrorMsg(
          err instanceof Error ? err.message : "Model reconstruction failed",
        );
        ctx.setStatus("error");
      }
    }
  };

  worker.onerror = (ev: ErrorEvent) => {
    res.modelParseWorker = null;
    if (!ctx.isDisposed()) {
      ctx.setErrorMsg(ev.message || "Model parse Worker crashed");
      ctx.setStatus("error");
    }
  };
}

/** Route to the correct format loader based on file extension. */
export async function loadModel(
  buf: ArrayBuffer,
  ext: string,
  ctx: LoaderContext,
  res: LoaderResources,
): Promise<void> {
  if (ext === "ifc") {
    await loadIfcModel(buf, ctx, res);
  } else if (ext === "glb" || ext === "gltf") {
    await loadGltfModel(buf, ext, ctx, res);
  } else if (ext === "obj" || ext === "stl") {
    await loadObjStlModel(buf, ext, ctx, res);
  }
}
