/**
 * OBJ/STL Web Worker — offloads 3D model parsing from the main thread (#447).
 *
 * Receives an ArrayBuffer of the model file plus the format identifier,
 * parses the model using Three.js loaders, extracts geometry data as
 * typed arrays, and returns them as Transferable Objects for zero-copy
 * transfer back to the main thread.
 */

export interface ModelParseInput {
  format: "obj" | "stl";
  buffer: ArrayBuffer;
}

export interface ModelParseMeshData {
  positions: Float32Array;
  normals: Float32Array | null;
  indices: Uint32Array | null;
}

export interface ModelParseResult {
  type: "result";
  meshes: ModelParseMeshData[];
}

export interface ModelParseError {
  type: "error";
  message: string;
}

export type ModelParseMessage = ModelParseResult | ModelParseError;

// TypeScript DOM lib types `self` as Window by default.
// Override postMessage to match DedicatedWorkerGlobalScope signature.
const _postMessage = self.postMessage as unknown as (
  message: unknown,
  transfer?: Transferable[],
) => void;

self.onmessage = async (e: MessageEvent<ModelParseInput>) => {
  try {
    const { format, buffer } = e.data;
    const meshes: ModelParseMeshData[] = [];

    if (format === "obj") {
      const { OBJLoader } = await import(
        "three/examples/jsm/loaders/OBJLoader.js"
      );
      const text = new TextDecoder().decode(new Uint8Array(buffer));
      const group = new OBJLoader().parse(text);

      group.traverse((child) => {
        if ("isMesh" in child && (child as { isMesh: boolean }).isMesh) {
          const mesh = child as unknown as {
            geometry: {
              getAttribute: (name: string) => { array: Float32Array } | null;
              getIndex: () => { array: Uint16Array | Uint32Array } | null;
            };
          };
          const posAttr = mesh.geometry.getAttribute("position");
          const normAttr = mesh.geometry.getAttribute("normal");
          const indexAttr = mesh.geometry.getIndex();

          if (posAttr) {
            meshes.push({
              positions: new Float32Array(posAttr.array),
              normals: normAttr ? new Float32Array(normAttr.array) : null,
              indices: indexAttr ? new Uint32Array(indexAttr.array) : null,
            });
          }
        }
      });
    } else if (format === "stl") {
      const { STLLoader } = await import(
        "three/examples/jsm/loaders/STLLoader.js"
      );
      const geometry = new STLLoader().parse(buffer);
      const posAttr = geometry.getAttribute("position");
      const normAttr = geometry.getAttribute("normal");
      const indexAttr = geometry.getIndex();

      if (posAttr) {
        meshes.push({
          positions: new Float32Array(posAttr.array),
          normals: normAttr ? new Float32Array(normAttr.array) : null,
          indices: indexAttr ? new Uint32Array(indexAttr.array) : null,
        });
      }
    } else {
      throw new Error("Unsupported format: " + String(format));
    }

    if (meshes.length === 0) {
      throw new Error("No geometry found in model file");
    }

    const transferables: Transferable[] = [];
    for (const m of meshes) {
      transferables.push(m.positions.buffer);
      if (m.normals) transferables.push(m.normals.buffer);
      if (m.indices) transferables.push(m.indices.buffer);
    }

    _postMessage(
      { type: "result", meshes } satisfies ModelParseResult,
      transferables,
    );
  } catch (err) {
    _postMessage({
      type: "error",
      message: err instanceof Error ? err.message : "Model parsing failed",
    } satisfies ModelParseError);
  }
};
